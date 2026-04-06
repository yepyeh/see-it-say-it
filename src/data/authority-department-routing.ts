export type AuthorityDepartmentOverride = {
  destinationType: "email" | "webform"
  destinationTarget: string
  departmentLabel?: string
}

const overrides: Record<string, Record<string, AuthorityDepartmentOverride>> = {
  "bristol-city-council": {
    "highways-maintenance": {
      destinationType: "email",
      destinationTarget: "highways@bristol.gov.uk",
      departmentLabel: "Highways maintenance",
    },
    "footway-maintenance": {
      destinationType: "email",
      destinationTarget: "highways@bristol.gov.uk",
      departmentLabel: "Footway maintenance",
    },
    "highways-signals": {
      destinationType: "email",
      destinationTarget: "highways@bristol.gov.uk",
      departmentLabel: "Traffic signals and crossings",
    },
    "network-management": {
      destinationType: "email",
      destinationTarget: "highways@bristol.gov.uk",
      departmentLabel: "Network management",
    },
  },
  "westminster-city-council": {
    "street-cleansing-litter": {
      destinationType: "email",
      destinationTarget: "streetcare@westminster.gov.uk",
      departmentLabel: "Street cleansing",
    },
    "public-bins": {
      destinationType: "email",
      destinationTarget: "streetcare@westminster.gov.uk",
      departmentLabel: "Public bins and street cleansing",
    },
    "street-scene-enforcement": {
      destinationType: "email",
      destinationTarget: "streetcare@westminster.gov.uk",
      departmentLabel: "Street scene enforcement",
    },
  },
  "manchester-city-council": {
    "street-cleansing-litter": {
      destinationType: "email",
      destinationTarget: "environment@manchester.gov.uk",
      departmentLabel: "Street cleansing",
    },
    "fly-tipping": {
      destinationType: "email",
      destinationTarget: "environment@manchester.gov.uk",
      departmentLabel: "Fly-tipping enforcement",
    },
    "public-bins": {
      destinationType: "email",
      destinationTarget: "environment@manchester.gov.uk",
      departmentLabel: "Public bins and street cleansing",
    },
    "street-scene-enforcement": {
      destinationType: "email",
      destinationTarget: "environment@manchester.gov.uk",
      departmentLabel: "Street scene enforcement",
    },
  },
}

export function resolveAuthorityDepartmentOverride(
  authorityCode?: string | null,
  queue?: string | null,
) {
  if (!authorityCode || !queue) return null
  return overrides[authorityCode]?.[queue] ?? null
}
