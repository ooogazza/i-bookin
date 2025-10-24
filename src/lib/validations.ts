import { z } from "zod";

// Gang member validation
export const gangMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  type: z.string().min(1, "Type is required"),
  amount: z.number().positive("Amount must be positive").max(1000000, "Amount is too large"),
});

// Site validation
export const siteSchema = z.object({
  name: z.string().trim().min(1, "Site name is required").max(255, "Site name must be less than 255 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional().nullable(),
  numberOfPlots: z.number().int("Must be a whole number").min(0, "Cannot be negative").max(10000, "Maximum 10,000 plots"),
  numberOfHouseTypes: z.number().int("Must be a whole number").min(0, "Cannot be negative").max(100, "Maximum 100 house types"),
});

// House type validation
export const houseTypeSchema = z.object({
  name: z.string().trim().min(1, "House type name is required").max(100, "Name must be less than 100 characters"),
  totalValue: z.number().positive("Total value must be positive").max(100000000, "Value is too large"),
});

// Lift value validation
export const liftValueSchema = z.object({
  value: z.number().min(0, "Value cannot be negative").max(100000000, "Value is too large"),
});

// Authentication validation
export const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be less than 100 characters"),
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters").optional(),
});

// Booking validation
export const bookingSchema = z.object({
  percentage: z.number().positive("Percentage must be positive").max(100, "Percentage cannot exceed 100"),
  invoiceNumber: z.string().trim().max(50, "Invoice number must be less than 50 characters").optional().nullable(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional().nullable(),
});

// Plot assignment validation
export const plotAssignmentSchema = z.object({
  plotNumber: z.number().int("Must be a whole number").positive("Plot number must be positive").max(10000, "Plot number too large"),
});

// Invitation validation
export const invitationSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
});
