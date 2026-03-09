// src/call-engine/variableEngine.js
//
// Injects per-contact variables into script templates.
// Template syntax: {{variable_name}}
//
// Handles Excel column name variations automatically:
//   {{driver_name}} ← "Driver Name", "drivername", "driver", "naam"
//   {{route}}       ← "Route No", "Route Number", "Bus Route"
//   {{timing}}      ← "Departure Time", "Time", "Schedule", "Samay"
//   {{vehicle_no}}  ← "Bus No", "Bus Number", "Vehicle No"
//   {{shift}}       ← "Shift", "Duty", "Duty Time"

const norm = s => s.toLowerCase().replace(/[\s_\-\.]/g, '')

// All known aliases per canonical variable name
const ALIASES = {
  'driver_name':  ['name', 'driver name', 'drivername', 'driver', 'naam', 'contact_name', 'full name', 'fullname'],
  'route':        ['route', 'route_no', 'route no', 'bus route', 'busroute', 'route number', 'routeno', 'rout'],
  'timing':       ['timing', 'time', 'departure', 'departure_time', 'departure time', 'depart time',
                   'start time', 'start_time', 'samay', 'schedule', 'scheduled time'],
  'vehicle_no':   ['vehicle', 'vehicle no', 'bus_no', 'bus no', 'bus number', 'busno',
                   'vehicle number', 'vehicleno', 'vahan', 'gaadi no', 'bus'],
  'shift':        ['shift', 'duty', 'duty_time', 'duty time'],
  'phone':        ['phone', 'mobile', 'number', 'contact', 'mobile number', 'phone number'],
  'area':         ['area', 'zone', 'location', 'place', 'locality'],
}

/**
 * Given a template variable name (e.g. 'route') and a contact's variable map,
 * find the matching value even if the column is named differently.
 */
function findValue(templateVar, contactVars) {
  const tv = norm(templateVar)

  // 1. Direct match (exact key)
  for (const [k, v] of Object.entries(contactVars)) {
    if (norm(k) === tv) return v
  }

  // 2. Template var is canonical → check all its aliases against contact keys
  const canonicalAliases = ALIASES[templateVar] || []
  for (const alias of canonicalAliases) {
    for (const [k, v] of Object.entries(contactVars)) {
      if (norm(k) === norm(alias)) return v
    }
  }

  // 3. Template var might itself be an alias → find canonical, then check
  for (const [canonical, aliasList] of Object.entries(ALIASES)) {
    if (aliasList.some(a => norm(a) === tv)) {
      // Found canonical — now check contact keys against all aliases
      for (const alias of [canonical, ...aliasList]) {
        for (const [k, v] of Object.entries(contactVars)) {
          if (norm(k) === norm(alias)) return v
        }
      }
    }
  }

  return undefined
}

/**
 * Inject contact variables into a template string.
 * Unresolved {{var}} are left as-is (not blanked out).
 */
function injectVariables(template, contactVariables = {}) {
  if (!template) return template

  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const val = findValue(key.trim(), contactVariables)
    return (val !== undefined && val !== null && String(val).trim() !== '')
      ? String(val).trim()
      : match
  })
}

/**
 * Extract all {{variable}} names from a template.
 */
function extractVariableNames(template) {
  if (!template) return []
  const matches = [...template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)]
  return [...new Set(matches.map(m => m[1].trim()))]
}

/**
 * Validate contact has all required variables.
 * Returns { valid: bool, missing: string[] }
 */
function validateContact(template, contactVariables) {
  const required = extractVariableNames(template)
  const missing  = required.filter(v => {
    const val = findValue(v, contactVariables)
    return val === undefined || val === null || String(val).trim() === ''
  })
  return { valid: missing.length === 0, missing }
}

module.exports = { injectVariables, extractVariableNames, validateContact }
