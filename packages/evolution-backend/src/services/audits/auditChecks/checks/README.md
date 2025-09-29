# Audit Check Functions

This directory contains the actual audit check functions organized by survey object type.

## Naming Convention

All audit check functions follow the pattern: `[SURVEY_OBJECT]_[TYPE]_[Description]`

- **Entity prefixes**: `I` (Interview), `HH` (Household), `HM` (Home), `P` (Person), `J` (Journey), `VP` (VisitedPlace), `T` (Trip), `S` (Segment)
- **Audit types**: `I` (Invalid), `L` (Logical), `M` (Missing)

## Current Audit Checks

### Missing Data Checks (M)
```typescript
// Interview
I_M_Languages      // Interview languages are missing

// Household  
HH_M_Size          // Household size is missing

// Home
HM_M_Geography     // Home geography is missing

// Person
P_M_Age            // Person age is missing

// Journey
J_M_StartDate      // Journey start date is missing

// VisitedPlace
VP_M_Geography     // Visited place geography is missing

// Trip
T_M_Segments       // Trip segments are missing

// Segment
S_M_Mode           // Segment mode is missing
```

### Invalid Data Checks (I)
```typescript
// Household
HH_I_Size          // Household size is out of range (1-20)

// Home  
HM_I_Geography     // Home geography is invalid (bad coordinates)

// VisitedPlace
VP_I_Geography     // Visited place geography is invalid
```

## Example Implementation

```typescript
// From HomeAuditChecks.ts
export const homeAuditChecks: { [errorCode: string]: HomeAuditCheckFunction } = {
    
    HM_M_Geography: (context: HomeAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { home } = context;
        
        if (!home.geography) {
            return {
                errorCode: 'HM_M_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is missing',
                ignore: false
            };
        }
        
        return undefined; // No audit needed
    },

    HM_I_Geography: (context: HomeAuditCheckContext): AuditForObject | undefined => {
        const { home } = context;
        const geography = home.geography;

        if (geography && (!isFeature(geography) || !isPoint(geography.geometry))) {
            return {
                objectType: 'home',
                objectUuid: home._uuid!,
                errorCode: 'HM_I_Geography',
                version: 1,
                level: 'error',
                message: 'Home geography is invalid',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
```

## Test Examples

```typescript
// From HomeAuditChecks.test.ts
describe('HM_M_Geography audit check', () => {
    it('should error when home has no geography', () => {
        const home = createMockHome({ geography: undefined });
        const context: HomeAuditCheckContext = { home, interview, household };

        const result = homeAuditChecks.HM_M_Geography(context);

        expect(result).toEqual({
            objectType: 'home',
            objectUuid: validUuid,
            errorCode: 'HM_M_Geography',
            version: 1,
            level: 'error',
            message: 'Home geography is missing',
            ignore: false
        });
    });
});

describe('HM_I_Geography audit check', () => {
    it('should error when geography has invalid coordinates', () => {
        const home = createMockHome({
            geography: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [-73.5] // Missing latitude
                }
            }
        });
        const context: HomeAuditCheckContext = { home, interview, household };

        const result = homeAuditChecks.HM_I_Geography(context);

        expect(result).toEqual({
            objectType: 'home',
            objectUuid: validUuid,
            errorCode: 'HM_I_Geography',
            version: 1,
            level: 'error',
            message: 'Home geography is invalid',
            ignore: false
        });
    });
});
```

## Creating New Audit Checks

1. Add your audit check function to the appropriate file (e.g., `HouseholdAuditChecks.ts`)
2. Follow the naming convention above
3. Use the provided context types from `../AuditCheckContexts.ts`
4. Return a partial `AuditForObject` or `undefined`
5. Add corresponding translations to `/locales/en/audits.json` and `/locales/fr/audits.json`
6. Write comprehensive tests in the `__tests__/` directory

## File Structure

- `InterviewAuditChecks.ts` - Interview-level audit checks
- `HouseholdAuditChecks.ts` - Household audit checks
- `HomeAuditChecks.ts` - Home audit checks  
- `PersonAuditChecks.ts` - Person audit checks
- `JourneyAuditChecks.ts` - Journey audit checks
- `VisitedPlaceAuditChecks.ts` - VisitedPlace audit checks
- `TripAuditChecks.ts` - Trip audit checks
- `SegmentAuditChecks.ts` - Segment audit checks
