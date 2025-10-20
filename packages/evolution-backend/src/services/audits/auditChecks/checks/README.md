# Audit Check Functions

This directory contains the actual audit check functions organized by survey object type.

## Naming Convention

All audit check functions follow the pattern: `[OBJECTPREFIX]_[AUDITCHECKTYPE]_[Description]`

### Survey Object Prefixes
- `I` - Interview
- `HH` - Household  
- `HM` - Home
- `P` - Person
- `J` - Journey
- `VP` - VisitedPlace
- `T` - Trip
- `S` - Segment

### Audit Check Types
- `M` - **Missing** data (e.g., `HH_M_Size` - household size is missing)
- `I` - **Invalid** data (e.g., `HH_I_Size` - household size is out of valid range)
- `L` - **Logical** error (e.g., `J_L_EndBeforeStart` - journey end time before start time)

### Examples
```typescript
I_M_Languages      // Interview languages are missing
HH_M_Size          // Household size is missing
HH_I_Size          // Household size is invalid (out of range 1-20)
HM_M_Geography     // Home geography is missing
P_M_Age            // Person age is missing
J_M_StartDate      // Journey start date is missing
VP_M_Geography     // Visited place geography is missing
T_M_Segments       // Trip segments are missing
S_M_Mode           // Segment mode is missing
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

## Test Organization

Tests are organized into **two types**:

### 1. Individual Audit Check Tests (Unit Tests)
Each audit check has its own test file in a folder named after the survey object:

```
__tests__/
├── home/
│   ├── HM_M_Geography.test.ts
│   └── HM_I_Geography.test.ts
├── household/
│   ├── HH_M_Size.test.ts
│   └── HH_I_Size.test.ts
├── interview/
│   └── I_M_Languages.test.ts
├── journey/
│   └── J_M_StartDate.test.ts
├── person/
│   └── P_M_Age.test.ts
├── segment/
│   └── S_M_Mode.test.ts
├── trip/
│   └── T_M_Segments.test.ts
└── visitedPlace/
    ├── VP_M_Geography.test.ts
    └── VP_I_Geography.test.ts
```

**Example unit test** (`__tests__/home/HM_M_Geography.test.ts`):
```typescript
describe('HM_M_Geography audit check', () => {
    it('should pass when home has valid geography', () => {
        const context = createContext();
        const result = homeAuditChecks.HM_M_Geography(context);
        expect(result).toBeUndefined();
    });

    it('should error when home has no geography', () => {
        const context = createContext({ geography: undefined });
        const result = homeAuditChecks.HM_M_Geography(context);
        
        expect(result).toMatchObject({
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
```

### 2. Integration Tests (Runner Tests)
Main test files (e.g., `HomeAuditChecks.test.ts`) test **only the audit runner orchestration** using **mocked audit checks**:

```typescript
// From HomeAuditChecks.test.ts
describe('runHomeAuditChecks - Integration', () => {
    it('should run all audit checks and return empty array when all checks pass', () => {
        const context = createContext();
        
        // Mock audit checks that all pass
        const mockAuditChecks: { [errorCode: string]: HomeAuditCheckFunction } = {
            TEST_CHECK_1: () => undefined,
            TEST_CHECK_2: () => undefined
        };

        const audits = runHomeAuditChecks(context, mockAuditChecks);
        expect(audits).toHaveLength(0);
    });

    it('should aggregate results from multiple failing checks', () => {
        const context = createContext();
        
        // Mock audit checks where some fail
        const mockAuditChecks: { [errorCode: string]: HomeAuditCheckFunction } = {
            TEST_PASS: () => undefined,
            TEST_FAIL: (): AuditForObject => ({
                objectType: 'home',
                objectUuid: validUuid,
                errorCode: 'TEST_FAIL',
                version: 1,
                level: 'error',
                message: 'Test failure',
                ignore: false
            })
        };

        const audits = runHomeAuditChecks(context, mockAuditChecks);
        expect(audits).toHaveLength(1);
    });
});
```

### Why This Structure?

✅ **Decoupled**: Main test files don't depend on actual audit check implementations  
✅ **Maintainable**: Adding new audit checks doesn't require updating integration tests  
✅ **Focused**: Each audit check has its own isolated test file  
✅ **Scalable**: Easy to find and update tests for specific audit checks

## Creating New Audit Checks

1. **Add the audit check function** to the appropriate file (e.g., `HouseholdAuditChecks.ts`)
2. **Follow the naming convention** above (e.g., `HH_M_Size`, `P_I_Age`)
3. **Use the provided context types** from `../AuditCheckContexts.ts`
4. **Return** a partial `AuditForObject` or `undefined`
5. **Add translations** to `/locales/en/audits.json` and `/locales/fr/audits.json`
6. **Create a dedicated test file** in `__tests__/[objectType]/[ERROR_CODE].test.ts`
   - ✅ **DO**: Create `__tests__/household/HH_M_Size.test.ts` for the `HH_M_Size` check
   - ❌ **DON'T**: Add tests to the main `HouseholdAuditChecks.test.ts` file
7. **Write comprehensive tests** covering:
   - ✅ Passing cases (when no audit is needed)
   - ✅ Failing cases (when the audit should trigger)
   - ✅ Edge cases (boundary conditions, empty values, etc.)

**Example: Adding a new audit check**

Step 1 - Add function to `HouseholdAuditChecks.ts`:
```typescript
HH_I_CarNumber: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
    const { household } = context;
    if (household.carNumber !== undefined && household.carNumber < 0) {
        return {
            objectType: 'household',
            objectUuid: household._uuid!,
            errorCode: 'HH_I_CarNumber',
            version: 1,
            level: 'error',
            message: 'Household car number is invalid',
            ignore: false
        };
    }
    return undefined;
}
```

Step 2 - Create `__tests__/household/HH_I_CarNumber.test.ts`:
```typescript
describe('HH_I_CarNumber audit check', () => {
    it('should pass when carNumber is valid', () => {
        const context = createContext({ carNumber: 2 });
        const result = householdAuditChecks.HH_I_CarNumber(context);
        expect(result).toBeUndefined();
    });

    it('should error when carNumber is negative', () => {
        const context = createContext({ carNumber: -1 });
        const result = householdAuditChecks.HH_I_CarNumber(context);
        expect(result).toMatchObject({
            objectType: 'household',
            objectUuid: validUuid,
            errorCode: 'HH_I_CarNumber',
            version: 1,
            level: 'error',
            message: 'Household car number is invalid',
            ignore: false
        });
    });
});
```

Step 3 - Add translations to `/locales/en/audits.json` and `/locales/fr/audits.json`

## File Structure

### Audit Check Implementation Files
- `InterviewAuditChecks.ts`
- `HouseholdAuditChecks.ts`
- `HomeAuditChecks.ts`
- `PersonAuditChecks.ts`
- `JourneyAuditChecks.ts`
- `VisitedPlaceAuditChecks.ts`
- `TripAuditChecks.ts`
- `SegmentAuditChecks.ts`

### Test Files
```
__tests__/
├── InterviewAuditChecks.test.ts    # Integration tests for interview runner
├── HouseholdAuditChecks.test.ts    # Integration tests for household runner
├── HomeAuditChecks.test.ts         # Integration tests for home runner
├── PersonAuditChecks.test.ts       # Integration tests for person runner
├── JourneyAuditChecks.test.ts      # Integration tests for journey runner
├── VisitedPlaceAuditChecks.test.ts # Integration tests for visited place runner
├── TripAuditChecks.test.ts         # Integration tests for trip runner
├── SegmentAuditChecks.test.ts      # Integration tests for segment runner
├── home/
│   └── [HM_*].test.ts             # Individual home audit check tests
├── household/
│   └── [HH_*].test.ts             # Individual household audit check tests
├── interview/
│   └── [I_*].test.ts              # Individual interview audit check tests
├── journey/
│   └── [J_*].test.ts              # Individual journey audit check tests
├── person/
│   └── [P_*].test.ts              # Individual person audit check tests
├── segment/
│   └── [S_*].test.ts              # Individual segment audit check tests
├── trip/
│   └── [T_*].test.ts              # Individual trip audit check tests
└── visitedPlace/
    └── [VP_*].test.ts             # Individual visited place audit check tests
```
