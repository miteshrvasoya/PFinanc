import { Request } from 'express';

export function getHouseholdId(req: Request): string {
  if (req.householdMembership?.household_id) {
    return req.householdMembership.household_id;
  }
  const headerVal = req.headers['x-household-id'];
  if (headerVal) {
    return Array.isArray(headerVal) ? headerVal[0] : headerVal;
  }
  const queryVal = req.query?.household_id;
  if (queryVal) {
    return Array.isArray(queryVal) ? String(queryVal[0]) : String(queryVal);
  }
  const bodyVal = req.body?.household_id;
  if (bodyVal) {
    return String(bodyVal);
  }
  const paramVal = req.params?.householdId;
  if (paramVal) {
    return Array.isArray(paramVal) ? String(paramVal[0]) : String(paramVal);
  }
  return '';
}

export function getParam(req: Request, name: string): string {
  const val = req.params?.[name];
  if (!val) return '';
  return Array.isArray(val) ? String(val[0]) : String(val);
}
