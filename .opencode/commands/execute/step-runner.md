# Step Runner Micro-command

## Purpose
Execute each step of the plan one by one, with validation and checkpointing.

## Steps
1. Get the next step from the execution context (based on currentStep).
2. If there are no more steps, proceed to finalize.
3. For the current step:
   a. Extract the action (e.g., "create file", "modify file", "run command").
   b. Validate that the action is allowed by the boundaries and allowedFiles.
   c. Execute the action:
        - If creating/modifying a file: 
            i. Read the file if it exists (for modification) or create new content.
            ii. Make the required changes as per the step description.
            iii. Validate the file against the plan (if there are any file-specific rules in the plan).
            iv. Write the file.
        - If running a command: Execute the command in the shell.
   d. After executing the step, update the execution-state.json to mark this step as completed.
   e. Update the design-checkpoint if the step completes a design element (e.g., a component, a service).
   f. Increment the currentStep and save the checkpoint.
4. Loop back to step 1.

## Enforcement
- Each step must be fully completed and validated before moving to the next.
- If a step fails, the executor stops and reports the error, waiting for user intervention.
- The executor must not deviate from the plan: no extra changes, no improvisation.

## Output
- Modified files (as per the plan).
- Updated execution-state.json and design-checkpoint.
- Progress towards the EXECUTED state.

## Usage
This micro-command is called in a loop by the execute command until all steps are done, then it hands off to finalize.