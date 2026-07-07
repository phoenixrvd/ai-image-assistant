# Coding Rules

## Complexity

- [BLOCKER] Methods should be at most 30 lines as a guideline
- [BLOCKER] Nesting should be limited to 2-3 levels
- [BLOCKER] Split complex logic into smaller, domain-meaningful units
- [WARNING] Keep simple guard checks compact but clearly readable

## Structure

- [BLOCKER] Code must be locally understandable, without unnecessary context jumps
- [BLOCKER] Constructors do not use keyword-only `*` patterns
- [WARNING] Keep related logic close together

## Context

- [BLOCKER] Do not pass context through multiple layers unnecessarily
- [BLOCKER] Classes instantiate required stores and services themselves; do not pass stores or services through constructor parameters
- [WARNING] Resolve context as close to its use as possible

## Wrapper / Delegation

- [BLOCKER] Keine Proxy- oder Delegationsmethoden ohne eigene Logik
- [BLOCKER] Keine Ein-Zeilen-Wrapper ohne Mehrwert

## Constants

- [BLOCKER] Use global constants only for real reuse, more than twice within a module
- [WARNING] Name unclear literals locally

## Dead Code

- [BLOCKER] Remove unused code immediately
- [BLOCKER] Code referenced only by tests or documentation counts as unused unless it is an intentionally preserved public interface
- [WARNING] Check IDE warnings, but do not apply them blindly

## Naming

- [WARNING] Names must clearly reflect their purpose
- [WARNING] Avoid unnecessary abbreviations
