package com.trainconcierge.common.json;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

/** Stores short string arrays as a JSON array in a portable VARCHAR column. */
@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<String> values) {
        if (values == null || values.isEmpty()) {
            return "[]";
        }
        try {
            return MAPPER.writeValueAsString(values);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not serialise a list of strings", ex);
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return MAPPER.readValue(value, TYPE);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not read a list of strings", ex);
        }
    }
}
