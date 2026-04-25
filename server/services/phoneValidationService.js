const CITY_RULES = [
  {
    city: "tunisia",
    aliases: ["tunisia", "tunis", "sfax", "sousse", "nabeul", "monastir", "gabes"],
    regex: /^\+216\d{8}$/,
    example: "+21612345678",
  },
  {
    city: "france",
    aliases: ["france", "paris", "lyon", "marseille", "nice", "toulouse", "lille"],
    regex: /^\+33\d{9}$/,
    example: "+33123456789",
  },
];

export function getPhoneRuleByCity(city) {
  const normalizedCity = String(city || "").trim().toLowerCase();
  return CITY_RULES.find((rule) => rule.aliases.includes(normalizedCity)) || null;
}

export function validatePhoneNumberByCity(city, phoneNumber) {
  const rule = getPhoneRuleByCity(city);

  if (!rule) {
    return {
      valid: false,
      message: "Unsupported city. Use Tunisia or France-based cities configured in the platform.",
    };
  }

  if (!rule.regex.test(String(phoneNumber || "").trim())) {
    return {
      valid: false,
      message: `Invalid phone number for ${city}. Expected format like ${rule.example}.`,
    };
  }

  return {
    valid: true,
    normalizedCity: rule.city,
    phoneNumber: String(phoneNumber || "").trim(),
  };
}
