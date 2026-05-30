// State Manager for opencode workflow
// Tracks workflow states and enables auto-chaining

const fs = require('fs');
const path = require('path');

class StateManager {
  constructor() {
    this.stateFile = path.join(process.cwd(), '.opencode', 'workflow-state.json');
    this.defaultState = {
      currentState: 'INITIAL',
      featureId: null,
      developer: null,
      taskType: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Initialize state for a new feature
  init(featureId, developer, taskType) {
    const state = {
      ...this.defaultState,
      featureId,
      developer,
      taskType,
      currentState: 'INITIAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.save(state);
    return state;
  }

  // Get current state
  get() {
    if (!fs.existsSync(this.stateFile)) {
      return null;
    }
    
    try {
      const data = fs.readFileSync(this.stateFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading state file:', error);
      return null;
    }
  }

  // Update state
  update(updates) {
    const current = this.get() || this.defaultState;
    const newState = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.save(newState);
    return newState;
  }

  // Transition to new state
  transition(newState) {
    const current = this.get();
    if (!current) {
      throw new Error('No state found. Initialize first.');
    }
    
    const state = {
      ...current,
      currentState: newState,
      updatedAt: new Date().toISOString()
    };
    
    this.save(state);
    return state;
  }

  // Save state to file
  save(state) {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf8');
  }

  // Check if state allows transition
  canTransition(fromState, toState) {
    const transitions = {
      INITIAL: ['RESEARCHED'],
      RESEARCHED: ['INNOVATE_SRS'],
      INNOVATE_SRS: ['SRS_CREATED'],
      SRS_CREATED: ['INNOVATE_TECHNICAL'],
      INNOVATE_TECHNICAL: ['BD_DD_CREATED'],
      BD_DD_CREATED: ['PLAN_CREATED'],
      PLAN_CREATED: ['PLAN_REVIEWED'],
      PLAN_REVIEWED: ['EXECUTED'],
      EXECUTED: ['VALIDATED'],
      VALIDATED: ['TESTED'],
      TESTED: [] // Final state
    };
    
    return transitions[fromState] && transitions[fromState].includes(toState);
  }

  // Get next command based on state
  getNextCommand(state) {
    const stateToCommand = {
      INITIAL: '/research',
      RESEARCHED: '/innovate',
      INNOVATE_SRS: '/innovate', // Part 2
      SRS_CREATED: '/design --srs',
      BASIC_DESIGN_CREATED: '/design --basic',
      BD_DD_CREATED: '/plan',
      PLAN_CREATED: '/plan-review',
      PLAN_REVIEWED: '/execute',
      EXECUTED: '/validate',
      VALIDATED: '/test',
      TESTED: null // Workflow complete
    };
    
    return stateToCommand[state] || null;
  }
}

module.exports = StateManager;