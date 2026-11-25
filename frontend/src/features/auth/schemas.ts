import { z } from 'zod'

export const PASSWORD_POLICY_MESSAGE = 'Password must be at least 4 characters.'

const emailField = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .max(190, 'Email is too long.')
  .email('Enter a valid email address.')

const newPasswordField = z
  .string()
  .min(1, 'Enter your password.')
  .min(4, PASSWORD_POLICY_MESSAGE)
  .max(72, 'Password is too long.')

export const signInSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'Enter your password.')
    .max(200, 'Password is too long.'),
})

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Enter your full name.')
      .max(120, 'Full name is too long.'),
    email: emailField,
    mobile: z
      .string()
      .trim()
      .max(20, 'Mobile number is too long.')
      .refine(
        (value) => value === '' || /^[6-9]\d{9}$/.test(value),
        'Enter a 10-digit mobile number.',
      ),
    password: newPasswordField,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type SignInValues = z.infer<typeof signInSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
