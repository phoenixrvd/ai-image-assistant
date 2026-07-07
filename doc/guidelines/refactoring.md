# Refactoring

## Basic Rules

- [BLOCKER] Reduce complexity with every change when it is possible without risk
- [BLOCKER] Do not introduce compatibility layers; adjust existing interfaces directly

## Constants

- [BLOCKER] Remove global constants when they are not used more than twice within a module
- [WARNING] Name unclear literals locally instead of extracting them globally
