package com.trainconcierge.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainconcierge.dto.TrainSearchResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Train data provider backed by the RailRadar REST API.
 * Endpoint: GET https://api.railradar.in/v1/trains/between/{from}/{to}?date=YYYY-MM-DD
 *
 * <p>This bean is only active when {@code railradar.api.key} is non-empty.
 * It is NOT used as the primary provider for booking — RailRadar delivers timetable data,
 * not live IRCTC seat reservation. Results are flagged as non-bookable.
 *
 * <p>Rate limits: free sandbox = 100 requests/month. Configure a paid plan for production use.
 *
 * <p>Required environment variable (or application.properties entry):
 * {@code RAILRADAR_API_KEY=rr_live_YOUR_API_KEY}
 */
@Component
@Slf4j
public class RailRadarTrainProvider implements TrainDataProvider {

    private static final String BASE_URL = "https://api.railradar.in/v1";
    private static final int TIMEOUT_MS = 8000;

    @Value("${railradar.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public RailRadarTrainProvider() {
        this.restTemplate = buildRestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String providerName() {
        return "RAILRADAR";
    }

    /** Returns true when an API key is configured. */
    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    @Override
    public List<TrainSearchResult> search(String from, String to, LocalDate date, int seats) {
        if (!isConfigured()) {
            throw new TrainProviderException(
                TrainProviderException.Reason.MISSING_CREDENTIALS,
                "RailRadar API key not configured. Set the RAILRADAR_API_KEY environment variable.");
        }

        String fromCode = resolveStationCode(from);
        String toCode   = resolveStationCode(to);

        String url = UriComponentsBuilder
                .fromHttpUrl(BASE_URL + "/trains/between/{from}/{to}")
                .queryParam("date", date.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .buildAndExpand(fromCode, toCode)
                .toUriString();

        log.info("RailRadarTrainProvider: GET {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            return parseResponse(response.getBody(), fromCode, toCode, date, seats);

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                log.error("RailRadar: 401 Unauthorized — check RAILRADAR_API_KEY");
                throw new TrainProviderException(
                    TrainProviderException.Reason.AUTHENTICATION_FAILURE,
                    "RailRadar authentication failed. Verify your API key.");
            }
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                log.warn("RailRadar: 429 Rate limited");
                throw new TrainProviderException(
                    TrainProviderException.Reason.RATE_LIMITED,
                    "RailRadar rate limit reached. Free sandbox allows 100 requests/month.");
            }
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                log.warn("RailRadar: 404 for route {}/{}", fromCode, toCode);
                // NOT_FOUND for a route pair means no trains — return empty, not an error
                return List.of();
            }
            log.error("RailRadar client error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new TrainProviderException(
                TrainProviderException.Reason.PROVIDER_ERROR,
                "RailRadar returned an error: " + e.getStatusCode());
        } catch (HttpServerErrorException e) {
            log.error("RailRadar server error {}", e.getStatusCode());
            throw new TrainProviderException(
                TrainProviderException.Reason.PROVIDER_ERROR,
                "RailRadar service error (" + e.getStatusCode() + "). Try again later.");
        } catch (ResourceAccessException e) {
            log.error("RailRadar timeout/connection error: {}", e.getMessage());
            throw new TrainProviderException(
                TrainProviderException.Reason.PROVIDER_TIMEOUT,
                "RailRadar did not respond in time. Try again in a moment.");
        } catch (Exception e) {
            log.error("RailRadar unexpected error: {}", e.getMessage(), e);
            throw new TrainProviderException(
                TrainProviderException.Reason.INTERNAL_ERROR,
                "Unexpected error contacting RailRadar: " + e.getMessage(), e);
        }
    }

    // ─── Response parsing ─────────────────────────────────────────────────────

    private List<TrainSearchResult> parseResponse(String body, String from, String to,
                                                   LocalDate date, int seats) {
        List<TrainSearchResult> results = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!root.path("success").asBoolean(false)) {
                log.warn("RailRadar: response success=false, body={}", body);
                return results;
            }
            JsonNode data = root.path("data");
            if (data.isMissingNode() || data.isNull()) return results;

            // RailRadar returns an array at data.trains or directly as an array
            JsonNode trains = data.isArray() ? data : data.path("trains");
            if (trains.isMissingNode() || !trains.isArray()) return results;

            for (JsonNode t : trains) {
                TrainSearchResult result = parseTrain(t, from, to, date, seats);
                if (result != null) results.add(result);
            }
        } catch (Exception e) {
            log.error("RailRadar: failed to parse response: {}", e.getMessage(), e);
            throw new TrainProviderException(
                TrainProviderException.Reason.PROVIDER_ERROR,
                "Could not parse RailRadar response: " + e.getMessage(), e);
        }
        return results;
    }

    private TrainSearchResult parseTrain(JsonNode t, String fromCode, String toCode,
                                          LocalDate date, int seats) {
        try {
            String trainNumber = getString(t, "trainNumber", "number", "train_number");
            String trainName   = getString(t, "trainName", "name", "train_name");
            if (!StringUtils.hasText(trainNumber)) return null;

            // Departure / arrival at the queried stations
            String depStr = getString(t, "departureTime", "departure", "dep");
            String arrStr = getString(t, "arrivalTime", "arrival", "arr");

            LocalTime dep = parseTime(depStr);
            LocalTime arr = parseTime(arrStr);

            // From/To station names
            String fromName = getString(t, "fromStation", "from", "sourceStation", "boardingStation");
            String toName   = getString(t, "toStation", "to", "destinationStation");
            if (!StringUtils.hasText(fromName)) fromName = fromCode;
            if (!StringUtils.hasText(toName))   toName   = toCode;

            // Availability — RailRadar provides timetable data, not live inventory
            int available = t.path("availableSeats").asInt(999);
            // If the provider says 0 explicitly, honour it; 999 = not provided (we default to showing it)
            if (available < seats && t.has("availableSeats")) return null; // skip if explicitly insufficient

            double price = t.path("fare").asDouble(0.0);
            if (price == 0.0) price = t.path("price").asDouble(0.0);

            String type = getString(t, "trainType", "type", "category");

            Integer duration = null;
            if (t.has("durationMinutes")) duration = t.path("durationMinutes").asInt();
            else if (dep != null && arr != null) {
                int diff = arr.toSecondOfDay() / 60 - dep.toSecondOfDay() / 60;
                if (diff < 0) diff += 24 * 60;
                duration = diff;
            }

            return TrainSearchResult.builder()
                    .id(null) // not in our DB
                    .trainNumber(trainNumber)
                    .trainName(trainName != null ? trainName : trainNumber)
                    .trainType(type)
                    .fromStation(fromName)
                    .fromStationCode(fromCode)
                    .toStation(toName)
                    .toStationCode(toCode)
                    .travelDate(date)
                    .departureTime(dep)
                    .arrivalTime(arr)
                    .durationMinutes(duration)
                    .availableSeats(available < 1000 ? available : 0)
                    .totalSeats(0)
                    .price(price)
                    .bookable(false) // RailRadar = timetable only, no IRCTC reservation
                    .status("ON_TIME")
                    .delayMinutes(t.path("delayMinutes").asInt(0))
                    .dataSource("RAILRADAR")
                    .dataNote("Timetable data from RailRadar — direct ticket booking not available in this app")
                    .build();
        } catch (Exception e) {
            log.warn("RailRadar: skipped one train due to parse error: {}", e.getMessage());
            return null;
        }
    }

    // ─── Utility helpers ──────────────────────────────────────────────────────

    /** Read the first non-null string from any of the given field names. */
    private static String getString(JsonNode node, String... fields) {
        for (String f : fields) {
            JsonNode v = node.path(f);
            if (!v.isMissingNode() && !v.isNull() && v.isTextual() && !v.asText().isEmpty())
                return v.asText();
        }
        return null;
    }

    private static LocalTime parseTime(String s) {
        if (!StringUtils.hasText(s)) return null;
        String norm = s.trim();
        // Handle "H:MM", "HH:MM", "H:MM:SS", "HH:MM:SS"
        if (norm.length() == 4 && norm.charAt(1) == ':') norm = "0" + norm; // "6:00" → "06:00"
        try {
            return LocalTime.parse(norm.length() == 5 ? norm : norm.substring(0, 5));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    // ─── Station code mapping ─────────────────────────────────────────────────

    /**
     * Maps a city name or partial station name to an IRCTC station code
     * used by the RailRadar API. Covers the cities seeded in DataSeeder plus
     * major Indian cities. Falls back to uppercasing the raw input as a best-effort code.
     */
    static String resolveStationCode(String input) {
        if (!StringUtils.hasText(input)) return input;
        String key = input.trim().toLowerCase();
        return STATION_MAP.getOrDefault(key, input.trim().toUpperCase());
    }

    private static final Map<String, String> STATION_MAP;
    static {
        Map<String, String> m = new LinkedHashMap<>();

        // ── Maharashtra ───────────────────────────────────────────────────────
        m.put("mumbai",                "CSTM");  // Mumbai CST (Chhatrapati Shivaji Maharaj Terminus)
        m.put("mumbai cst",            "CSTM");
        m.put("csmt",                  "CSTM");
        m.put("mumbai central",        "BCT");
        m.put("bandra terminus",       "BDTS");
        m.put("lokmanya tilak",        "LTT");
        m.put("lokmanya tilak terminus","LTT");
        m.put("kurla",                 "LTT");
        m.put("dadar",                 "DDR");
        m.put("thane",                 "TNA");
        m.put("panvel",                "PNVL");
        m.put("pune",                  "PUNE");
        m.put("pune junction",         "PUNE");
        m.put("pune jn",               "PUNE");
        m.put("shivajinagar",          "SVJR");
        m.put("hadapsar",              "HDP");
        m.put("khadki",                "KK");
        m.put("talegaon",              "TGN");
        m.put("lonavala",              "LNL");
        m.put("karjat",                "KJT");
        m.put("nagpur",                "NGP");
        m.put("nagpur junction",       "NGP");
        m.put("wardha",                "WR");
        m.put("amravati",              "AMI");
        m.put("akola",                 "AK");
        m.put("nashik",                "NK");
        m.put("nashik road",           "NK");
        m.put("manmad",                "MMR");
        m.put("aurangabad",            "AWB");
        m.put("jalgaon",               "JL");
        m.put("bhusawal",              "BSL");
        m.put("nandurbar",             "NDB");
        m.put("solapur",               "SUR");
        m.put("solapur junction",      "SUR");
        m.put("latur",                 "LUR");
        m.put("latur road",            "LRD");
        m.put("osmanabad",             "OMB");
        m.put("bidar",                 "BIDR");
        m.put("nanded",                "NED");
        m.put("parbhani",              "PBN");
        m.put("kolhapur",              "KOP");
        m.put("kolhapur cst",          "KOP");
        m.put("c shahumharaj terminus","KOP");
        // ─── KEY FIX: Miraj Junction ─────────────────────────────────────────
        m.put("miraj",                 "MRJ");
        m.put("miraj junction",        "MRJ");
        m.put("miraj jn",              "MRJ");
        m.put("mrj",                   "MRJ");
        // ─── Other important Maharashtra stations ────────────────────────────
        m.put("sangli",                "SLI");
        m.put("sangli junction",       "SLI");
        m.put("satara",                "STR");
        m.put("karad",                 "KRD");
        m.put("khed",                  "KHED");
        m.put("chiplun",               "CHI");
        m.put("ratnagiri",             "RN");
        m.put("kankavali",             "KKWL");
        m.put("kudal",                 "KUDL");
        m.put("sawantwadi",            "SNDD");
        m.put("sawantwadi road",       "SNDD");
        m.put("raigad",                "RIGD");
        m.put("pen",                   "PEN");
        m.put("roha",                  "ROHA");
        m.put("mangaon",               "MNGN");
        m.put("khed ratnagiri",        "KHED");
        m.put("igatpuri",              "IGP");
        m.put("ghoti",                 "GI");
        m.put("kalyan",                "KYN");
        m.put("dombivli",              "DI");
        m.put("badlapur",              "BLP");
        m.put("vasai road",            "BSR");
        m.put("virar",                 "VR");
        m.put("palghar",               "PLG");
        m.put("boisar",                "BOR");
        m.put("dahanu road",           "DRD");
        m.put("kopargaon",             "KPG");
        m.put("ahmednagar",            "ANG");
        m.put("belapur",               "CBE");
        m.put("daund",                 "DD");
        m.put("daund junction",        "DD");
        m.put("wadi",                  "WADI");
        m.put("gulbarga",              "GR");   // now Kalaburagi
        m.put("kalaburagi",            "GR");

        // ── Goa ───────────────────────────────────────────────────────────────
        m.put("goa",                   "MAO");   // Madgaon (Margao)
        m.put("madgaon",               "MAO");
        m.put("margao",                "MAO");
        m.put("vasco da gama",         "VSG");
        m.put("vasco",                 "VSG");
        m.put("karmali",               "KRMI");
        m.put("thivim",                "THVM");
        m.put("panaji",                "MAO");

        // ── Karnataka ─────────────────────────────────────────────────────────
        m.put("bangalore",             "SBC");   // KSR Bengaluru (Bangalore City)
        m.put("bengaluru",             "SBC");
        m.put("bangalore city",        "SBC");
        m.put("bengaluru city",        "SBC");
        m.put("ksr bengaluru",         "SBC");
        m.put("yeshwantpur",           "YPR");
        m.put("yelahanka",             "YNK");
        m.put("bangalore cant",        "BNC");
        m.put("whitefield",            "WFD");
        m.put("hubli",                 "UBL");
        m.put("hubli junction",        "UBL");
        m.put("dharwad",               "DWR");
        m.put("gadag",                 "GDG");
        m.put("bijapur",               "BJP");
        m.put("vijayapura",            "BJP");
        m.put("hospet",                "HPT");
        m.put("davangere",             "DVG");
        m.put("tumkur",                "TK");
        m.put("hassan",                "HAS");
        m.put("mangalore",             "MAQ");
        m.put("mangaluru",             "MAQ");
        m.put("mangaluru central",     "MAQ");
        m.put("udupi",                 "UD");
        m.put("mysore",                "MYS");
        m.put("mysuru",                "MYS");
        m.put("mysore junction",       "MYS");
        m.put("mandya",                "MYA");
        m.put("raichur",               "RC");
        m.put("bellary",               "BAY");
        m.put("ballari",               "BAY");
        m.put("shimoga",               "SMET");
        m.put("shivamogga",            "SMET");

        // ── Andhra Pradesh / Telangana ─────────────────────────────────────────
        m.put("hyderabad",             "HYB");
        m.put("secunderabad",          "SC");
        m.put("nampally",              "HYB");
        m.put("kachiguda",             "KC");
        m.put("visakhapatnam",         "VSKP");
        m.put("vizag",                 "VSKP");
        m.put("vijayawada",            "BZA");
        m.put("vijayawada junction",   "BZA");
        m.put("guntur",                "GNT");
        m.put("tirupati",              "TPTY");
        m.put("renigunta",             "RU");
        m.put("nellore",               "NLR");
        m.put("warangal",              "WL");
        m.put("kazipet",               "KZJ");
        m.put("rajahmundry",           "RJY");
        m.put("eluru",                 "EE");
        m.put("tenali",                "TEL");
        m.put("ongole",                "OGL");

        // ── Tamil Nadu ─────────────────────────────────────────────────────────
        m.put("chennai",               "MAS");   // Chennai Central
        m.put("chennai central",       "MAS");
        m.put("chennai egmore",        "MS");
        m.put("tambaram",              "TBM");
        m.put("coimbatore",            "CBE");
        m.put("coimbatore junction",   "CBE");
        m.put("erode",                 "ED");
        m.put("erode junction",        "ED");
        m.put("madurai",               "MDU");
        m.put("madurai junction",      "MDU");
        m.put("salem",                 "SA");
        m.put("tiruchirappalli",       "TPJ");
        m.put("trichy",                "TPJ");
        m.put("thanjavur",             "TJ");
        m.put("tirunelveli",           "TEN");
        m.put("palakkad",              "PGT");
        m.put("katpadi",               "KPD");
        m.put("vellore",               "KPD");

        // ── Kerala ────────────────────────────────────────────────────────────
        m.put("kochi",                 "ERS");   // Ernakulam Junction
        m.put("cochin",                "ERS");
        m.put("ernakulam",             "ERS");
        m.put("ernakulam junction",    "ERS");
        m.put("ernakulam town",        "ERN");
        m.put("trivandrum",            "TVC");
        m.put("thiruvananthapuram",    "TVC");
        m.put("thiruvananthapuram central","TVC");
        m.put("calicut",               "CLT");
        m.put("kozhikode",             "CLT");
        m.put("thrissur",              "TCR");
        m.put("palakkad junction",     "PGT");
        m.put("shoranur",              "SRR");
        m.put("kayamkulam",            "KYJ");
        m.put("kollam",                "QLN");
        m.put("kottayam",              "KTYM");
        m.put("alappuzha",             "ALLP");
        m.put("alappey",               "ALLP");

        // ── Delhi NCR ─────────────────────────────────────────────────────────
        m.put("delhi",                 "NDLS");
        m.put("new delhi",             "NDLS");
        m.put("delhi junction",        "DLI");
        m.put("old delhi",             "DLI");
        m.put("hazrat nizamuddin",     "NZM");
        m.put("nizamuddin",            "NZM");
        m.put("anand vihar",           "ANVT");
        m.put("sarai rohilla",         "DEE");
        m.put("gurgaon",               "GGN");
        m.put("gurugram",              "GGN");
        m.put("faridabad",             "FDB");
        m.put("noida",                 "NDLS");

        // ── Uttar Pradesh ─────────────────────────────────────────────────────
        m.put("lucknow",               "LKO");
        m.put("lucknow junction",      "LJN");
        m.put("lucknow nr",            "LKO");
        m.put("kanpur",                "CNB");
        m.put("kanpur central",        "CNB");
        m.put("allahabad",             "PRYJ");
        m.put("prayagraj",             "PRYJ");
        m.put("varanasi",              "BSB");
        m.put("varanasi junction",     "BSB");
        m.put("mughal sarai",          "MGS");
        m.put("mughalsarai",           "MGS");
        m.put("agra",                  "AGC");
        m.put("agra cantt",            "AGC");
        m.put("mathura",               "MTJ");
        m.put("mathura junction",      "MTJ");
        m.put("gorakhpur",             "GKP");
        m.put("gorakhpur junction",    "GKP");
        m.put("meerut",                "MTC");
        m.put("ghaziabad",             "GZB");
        m.put("aligarh",               "ALJN");
        m.put("bareilly",              "BE");
        m.put("moradabad",             "MB");
        m.put("jhansi",                "JHS");

        // ── Rajasthan ─────────────────────────────────────────────────────────
        m.put("jaipur",                "JP");
        m.put("jaipur junction",       "JP");
        m.put("jodhpur",               "JU");
        m.put("jodhpur junction",      "JU");
        m.put("udaipur",               "UDZ");
        m.put("udaipur city",          "UDZ");
        m.put("ajmer",                 "AII");
        m.put("ajmer junction",        "AII");
        m.put("kota",                  "KOTA");
        m.put("bikaner",               "BKN");
        m.put("alwar",                 "AWR");

        // ── Madhya Pradesh / Chhattisgarh ─────────────────────────────────────
        m.put("bhopal",                "BPL");
        m.put("bhopal junction",       "BPL");
        m.put("habibganj",             "HBJ");
        m.put("rani kamlapati",        "HBJ");
        m.put("indore",                "INDB");
        m.put("indore junction",       "INDB");
        m.put("ujjain",                "UJN");
        m.put("gwalior",               "GWL");
        m.put("jabalpur",              "JBP");
        m.put("raipur",                "R");
        m.put("bilaspur",              "BSP");
        m.put("katni",                 "KTE");

        // ── Gujarat ───────────────────────────────────────────────────────────
        m.put("ahmedabad",             "ADI");
        m.put("ahmedabad junction",    "ADI");
        m.put("surat",                 "ST");
        m.put("vadodara",              "BRC");
        m.put("baroda",                "BRC");
        m.put("bharuch",               "BH");
        m.put("vapi",                  "VAPI");
        m.put("rajkot",                "RJT");
        m.put("bhavnagar",             "BVP");
        m.put("gandhidham",            "GIMB");
        m.put("mehsana",               "MSH");
        m.put("anand",                 "ANND");

        // ── West Bengal ───────────────────────────────────────────────────────
        m.put("kolkata",               "HWH");   // Howrah
        m.put("howrah",                "HWH");
        m.put("sealdah",               "SDAH");
        m.put("kolkata terminal",      "KOAA");
        m.put("shalimar",              "SHM");
        m.put("asansol",               "ASN");
        m.put("durgapur",              "DGR");
        m.put("kharagpur",             "KGP");
        m.put("bardhaman",             "BWN");
        m.put("burdwan",               "BWN");
        m.put("new jalpaiguri",        "NJP");
        m.put("njp",                   "NJP");
        m.put("siliguri",              "SGUJ");

        // ── Odisha / Jharkhand ─────────────────────────────────────────────────
        m.put("bhubaneswar",           "BBS");
        m.put("puri",                  "PURI");
        m.put("cuttack",               "CTC");
        m.put("berhampur",             "BAM");
        m.put("ranchi",                "RNC");
        m.put("dhanbad",               "DHN");
        m.put("bokaro",                "BKSC");
        m.put("jamshedpur",            "TATA");
        m.put("tatanagar",             "TATA");

        // ── Bihar ─────────────────────────────────────────────────────────────
        m.put("patna",                 "PNBE");
        m.put("patna junction",        "PNBE");
        m.put("gaya",                  "GAYA");
        m.put("muzaffarpur",           "MFP");
        m.put("darbhanga",             "DBG");

        // ── Punjab / Haryana ──────────────────────────────────────────────────
        m.put("amritsar",              "ASR");
        m.put("amritsar junction",     "ASR");
        m.put("ludhiana",              "LDH");
        m.put("jalandhar",             "JUC");
        m.put("pathankot",             "PTKC");
        m.put("chandigarh",            "CDG");
        m.put("ambala",                "UMB");
        m.put("ambala cantt",          "UMB");
        m.put("panipat",               "PNP");
        m.put("kurukshetra",           "KKDE");

        // ── Himachal / Uttarakhand / J&K ─────────────────────────────────────
        m.put("dehradun",              "DDN");
        m.put("haridwar",              "HW");
        m.put("rishikesh",             "RKSH");
        m.put("jammu",                 "JAT");
        m.put("jammu tawi",            "JAT");
        m.put("udhampur",              "UHP");
        m.put("kathua",                "KTH");

        // ── Assam / NE ────────────────────────────────────────────────────────
        m.put("guwahati",              "GHY");
        m.put("dibrugarh",             "DBRG");
        m.put("jorhat",                "JT");
        m.put("silchar",               "SCL");
        m.put("agartala",              "AGTL");
        m.put("new tinsukia",          "NTSK");

        STATION_MAP = Collections.unmodifiableMap(m);
    }

    // ─── RestTemplate with timeout ────────────────────────────────────────────

    private static RestTemplate buildRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        return new RestTemplate(factory);
    }
}
