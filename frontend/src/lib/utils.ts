import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits ? Number(digits).toLocaleString("es-CO") : ""
}

export function parseMoneyInput(value: string) {
  return value.replace(/\D/g, "")
}
