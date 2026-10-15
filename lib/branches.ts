export const branches = [
  { code: 'CSE', name: 'Computer Science and Engineering (CSE)' },
  { code: 'CSE-AIML', name: 'Computer Science and Engineering (AI & ML)' },
  { code: 'CSE-DS', name: 'Computer Science and Engineering (Data Science)' },
  { code: 'AI', name: 'Artificial Intelligence (AI)' },
  { code: 'AI-DS', name: 'Artificial Intelligence & Data Science (AI & DS)' },
  { code: 'QC', name: 'Quantum Computing' },
  { code: 'IT', name: 'Information Technology (IT)' },
  { code: 'ECE', name: 'Electronics and Communication Engineering (ECE)' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering (EEE)' },
  { code: 'MECH', name: 'Mechanical Engineering (MECH)' },
  { code: 'CIV', name: 'Civil Engineering (CIV)' },
  { code: 'CHEM', name: 'Chemical Engineering (CHEM)' },
] as const

export const branchCodes = branches.map(({ code }) => code)

export function branchName(code: string) {
  return branches.find((branch) => branch.code === code)?.name ?? code
}
