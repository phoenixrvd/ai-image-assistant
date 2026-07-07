# Error Handling

## Basic Rules

- [BLOCKER] Do not use `try/catch` without meaningful handling
- [BLOCKER] Errors must not be swallowed silently
- [BLOCKER] Do not replace or alter the original error unless a domain-specific transformation is being performed

## Using catch

- [BLOCKER] Use `catch` only when there is a domain-specific response
- [WARNING] Pass errors through unchanged when there is no domain-specific handling

## Error Types

- [BLOCKER] Do not reinterpret technical errors as domain errors
- [BLOCKER] Do not hide technical implementation errors behind exception handling

## Custom Exceptions

- [BLOCKER] Use custom exception logic only when it has domain meaning
