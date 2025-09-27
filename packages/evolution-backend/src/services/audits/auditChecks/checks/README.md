# Audit Check Functions

This directory contains the actual audit check functions organized by survey object type.

## Naming Convention

All audit check functions follow the pattern: `[SURVEY_OBJECT]_[TYPE]_[Description]`

- **Entity prefixes**: `I` (Interview), `HH` (Household), `HM` (Home), `P` (Person), `J` (Journey), `VP` (VisitedPlace), `T` (Trip), `S` (Segments)
- **Audit types**: `I` (Invalid), `L` (Logical), `M` (Missing)

## Examples

```typescript
// Missing data checks
HH_M_Uuid          // Household missing UUID
VP_M_Geography     // VisitedPlace missing geography
P_M_Age            // Person missing age

// Invalid data checks  
HH_I_Size          // Household invalid size
T_I_Mode           // Trip invalid mode
S_I_Distance       // Segment invalid distance

// Logical inconsistency checks
T_L_TimeSequence   // Trip time sequence logical error
J_L_Duration       // Journey duration logical inconsistency
```

## Creating New Audit Checks

1. Add your audit check function to the appropriate file (e.g., `HouseholdAuditChecks.ts`)
2. Follow the naming convention above
3. Use the provided context types from `../infrastructure/AuditCheckContexts.ts`
4. Return a partial `AuditForObject` or `undefined`

## File Structure

- `InterviewAuditChecks.ts` - Interview-level audit checks
- `HouseholdAuditChecks.ts` - Household audit checks
- `HomeAuditChecks.ts` - Home audit checks  
- `PersonAuditChecks.ts` - Person audit checks
- `JourneyAuditChecks.ts` - Journey audit checks
- `VisitedPlaceAuditChecks.ts` - VisitedPlace audit checks
- `TripAuditChecks.ts` - Trip audit checks
- `SegmentAuditChecks.ts` - Segment audit checks

The infrastructure code (contexts, runners) is in the `../infrastructure/` directory.
