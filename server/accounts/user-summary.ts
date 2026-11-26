import type { Account } from '../types.js'

export function userSummary(user: Account, bootstrapId?: string) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    disabled: user.disabled,
    assignedTests: user.assignedTests,
    bootstrap: user._id === bootstrapId,
  }
}
