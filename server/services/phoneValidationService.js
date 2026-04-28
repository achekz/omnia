const CITY_RULES = [
  { city: "tunisia", aliases: ["tunisia", "tunis", "sfax", "sousse", "nabeul", "monastir", "gabes"], dialCode: "+216" },
  { city: "france", aliases: ["france", "paris", "lyon", "marseille", "nice", "toulouse", "lille"], dialCode: "+33" },
  { city: "united states", aliases: ["united states", "usa", "us", "new york", "los angeles", "chicago"], dialCode: "+1" },
  { city: "canada", aliases: ["canada", "toronto", "montreal", "vancouver"], dialCode: "+1" },
  { city: "united kingdom", aliases: ["united kingdom", "uk", "england", "london", "manchester"], dialCode: "+44" },
  { city: "germany", aliases: ["germany", "berlin", "munich", "hamburg"], dialCode: "+49" },
  { city: "italy", aliases: ["italy", "rome", "milan", "naples"], dialCode: "+39" },
  { city: "spain", aliases: ["spain", "madrid", "barcelona", "valencia"], dialCode: "+34" },
  { city: "morocco", aliases: ["morocco", "casablanca", "rabat", "marrakesh"], dialCode: "+212" },
  { city: "algeria", aliases: ["algeria", "algiers", "oran"], dialCode: "+213" },
  { city: "egypt", aliases: ["egypt", "cairo", "alexandria"], dialCode: "+20" },
  { city: "saudi arabia", aliases: ["saudi arabia", "riyadh", "jeddah"], dialCode: "+966" },
  { city: "united arab emirates", aliases: ["united arab emirates", "uae", "dubai", "abu dhabi"], dialCode: "+971" },
  { city: "qatar", aliases: ["qatar", "doha"], dialCode: "+974" },
  { city: "turkey", aliases: ["turkey", "istanbul", "ankara"], dialCode: "+90" },
  { city: "india", aliases: ["india", "delhi", "mumbai", "bangalore"], dialCode: "+91" },
  { city: "china", aliases: ["china", "beijing", "shanghai"], dialCode: "+86" },
  { city: "japan", aliases: ["japan", "tokyo", "osaka"], dialCode: "+81" },
  { city: "south korea", aliases: ["south korea", "seoul", "busan"], dialCode: "+82" },
  { city: "brazil", aliases: ["brazil", "sao paulo", "rio de janeiro"], dialCode: "+55" },
  { city: "mexico", aliases: ["mexico", "mexico city", "guadalajara"], dialCode: "+52" },
  { city: "argentina", aliases: ["argentina", "buenos aires"], dialCode: "+54" },
  { city: "australia", aliases: ["australia", "sydney", "melbourne"], dialCode: "+61" },
  { city: "south africa", aliases: ["south africa", "cape town", "johannesburg"], dialCode: "+27" },
];

export function getPhoneRuleByCity(city) {
  const normalizedCity = String(city || "").trim().toLowerCase();
  return CITY_RULES.find((rule) => rule.aliases.includes(normalizedCity)) || null;
}

export function validatePhoneNumberByCity(city, phoneNumber) {
  const rule = getPhoneRuleByCity(city);
  const rawPhone = String(phoneNumber || "").trim();
  const compactPhone = rawPhone.replace(/[\s().-]/g, "");

  if (!rule) {
    return {
      valid: false,
      message: "Unsupported country/city. Please select a supported country from the list.",
    };
  }

  let normalizedPhone = compactPhone;
  if (!normalizedPhone.startsWith("+")) {
    normalizedPhone = `${rule.dialCode}${normalizedPhone.replace(/^0+/, "")}`;
  }

  const nationalNumber = normalizedPhone.slice(rule.dialCode.length);
  const isValid =
    normalizedPhone.startsWith(rule.dialCode) &&
    /^\+\d{6,15}$/.test(normalizedPhone) &&
    /^\d{4,12}$/.test(nationalNumber);

  if (!isValid) {
    return {
      valid: false,
      message: `Invalid phone number for ${city}. Use a local number or the international format starting with ${rule.dialCode}.`,
    };
  }

  return {
    valid: true,
    normalizedCity: rule.city,
    phoneNumber: normalizedPhone,
  };
}
