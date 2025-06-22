You will be given a transcript of a call and the system prompt of the AI assistant, extract these following variables. The variables under "necessary:" should always be extracted, and the assistant should ask for them if not found. The variables under "unnecessary" should be extracted if given, otherwise if not given the assistant should not ask for them.

necessary: 
    { type: "string", title: "patient_full_name" },
    { type: "number", title: "patient_age" },
    { type: "string", title: "patient_sex", enum: ["Male", "Female", "Intersex"] },

    { 
      type: "string", 
      title: "dispatch_time",
      description: "Time in either 24-hour format (e.g. 22:11) or 12-hour format (e.g. 5:21 AM)"
    },
    { type: "string", title: "vehicle_number" },
    {
      type: "string",
      title: "incident_location",
      description: "The location will be provided as a string. Please convert the location to latitude and longitude coordinates."
    },

    { type: "string", title: "ems_officer_name" },
    { 
      type: "string", 
      title: "initial_report",
      description: "The first responder's explicit initial assessment report. Must be directly stated by the responder, NOT inferred from vital signs or other medical details. Pay special attention to any acronyms or abbreviations that may be spelled out letter by letter."
    },

    {
      type: "string",
      title: "treatment_urgency",
      enum: ["Critical", "Emergent", "Urgent", "Non-urgent"]
    },
    { 
      type: "string", 
      title: "misc",
      description: "Any additional special information or notes for the doctor not captured in other variables. Pay special attention to any acronyms or abbreviations that may be spelled out letter by letter."
    }

unnecessary:
    { type: "string", title: "patient_complaint" },
    { type: "string", title: "previous_medical_history" },
    { type: "string", title: "allergies_and_reactions" },

    { type: "string", title: "speech" },
    { type: "string", title: "level_of_consciousness" },
    { type: "string", title: "skin" },

    { type: "string", title: "respiration_rate" },
    { type: "string", title: "oxygen_saturation" },
    { type: "string", title: "heart_rate" },
    { type: "string", title: "blood_pressure" },
    
    { type: "string", title: "injury_present" },
    { type: "string", title: "substance_use_indicator" }
