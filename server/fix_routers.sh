#!/bin/bash
# Fix the routers.ts to properly handle JSON response

sed -i '355s/mainContent: parsed.mainContent,/mainContent: JSON.stringify(parsed),/' routers.ts
sed -i '356s/researchSourcesCount: parsed.researchSources.length,/researchSourcesCount: (parsed.researchSources || []).length,/' routers.ts
sed -i '357s/jotsNotesCount: parsed.jotsNotesCount,/jotsNotesCount: countJotsNotes(parsed),/' routers.ts

# Add helper function to count jots notes
sed -i '/import { nanoid } from "nanoid";/a\
\
// Helper to count total jots notes across all sections\
function countJotsNotes(parsed: any): number {\
  let count = 0;\
  if (parsed.sections) {\
    for (const section of parsed.sections) {\
      if (section.subsections) {\
        for (const subsection of section.subsections) {\
          if (subsection.jotsNotes) {\
            count += subsection.jotsNotes.length;\
          }\
        }\
      }\
    }\
  }\
  return count;\
}' routers.ts

echo "Fixed routers.ts"
