---
trigger: always_on
---

Phase 1: Feature Decomposition & Documentation

For every feature service, you must decompose it into smaller, manageable modules. Each module must include:

    A .agent file: Create a dedicated file named [module_name].agent.

    Mandatory Content in .agent:

        Functionality: Detailed description of what the module does.

        Tasks: List of specific technical tasks the module handles.

        Purpose: The "Why" behind this module and its value to the feature.

        General Roadmap: High-level architectural direction and how it integrates with the overall feature.

Phase 2: Interactive Analysis Workflow

Before execution, you must follow this communication protocol:

    Prompt Analysis: Deeply analyze the user's request to identify the specific feature involved.

    Confirmation Loop: Ask clarifying questions to the user to confirm you have identified the correct feature/module.

    Targeted Reading: Once confirmed, you are strictly required to:

        Read the relevant .agent files of those specific modules only.

        Read the associated .md (Markdown) documentation files for technical context.

        Avoid scanning unrelated files to maintain focus and efficiency.