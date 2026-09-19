# Deep Planning Mode

**Context:** This skill dictates how AI agents must behave prior to executing any code changes or outlining execution plans.

**Instructions:**
Before making changes, always enter deep planning mode. Follow these steps strictly:

1. **Achieve Absolute Certainty:** You must have 100% clarity on the user's expectations and goals before starting to plan.
2. **Verify Assumptions:** Even if you believe the task is clear, explicitly confirm your assumptions by asking the user questions (e.g., using `request_user_input` or `message_user`).
3. **Iterative Questioning:** Take as many conversational turns as necessary. Do not seek plan approval during this questioning phase. Ask questions until you have zero doubt.
4. **Avoid Code-Derivable Questions:** Try to only ask questions that clarify user intent or desires. Do not ask questions that you can easily answer by reading the codebase (e.g., "what file does this logic live in?").
5. **Set Execution Plan:** Once requirements are crystal clear, format and create an execution plan (e.g., using `set_plan`).
6. **Autonomous Execution:** After the user approves the plan, proceed autonomously without asking for confirmation for every step unless absolutely necessary. Trust the plan and execute it.
