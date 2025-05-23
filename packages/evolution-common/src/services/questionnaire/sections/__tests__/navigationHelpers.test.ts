/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getLastVisitedSection, isIterationContextStarted, isSectionCompleted } from '../navigationHelpers';
import { UserRuntimeInterviewAttributes } from '../../types';

describe('getLastVisitedSection', () => {
    it('should return the last visited section when there are section actions', () => {
        const interview = {
            response: {
                _sections: {
                    _actions: [
                        { section: 'section1', action: 'viewed', ts: 1 },
                        { section: 'section2', action: 'viewed', ts: 3 }
                    ]
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(getLastVisitedSection({ interview })).toEqual({ sectionShortname: 'section2', iterationContext: undefined });
    });

    it('should return the last visited section with iteration context when there are section actions', () => {
        const interview = {
            response: {
                _sections: {
                    _actions: [
                        { section: 'section1', action: 'viewed', ts: 1 },
                        { section: 'section2', iterationContext: [ 'person', 'uuid' ], action: 'viewed', ts: 3 }
                    ]
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(getLastVisitedSection({ interview })).toEqual({ sectionShortname: 'section2', iterationContext: [ 'person', 'uuid' ] });
    });

    it('should return undefined when there are no section actions', () => {
        const interview = {
            response: {
                _sections: {
                    _actions: []
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(getLastVisitedSection({ interview })).toBeUndefined();
    });

    it('should return undefined when _actions does not exist', () => {
        const interview = {
            response: {
                _sections: {}
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(getLastVisitedSection({ interview })).toBeUndefined();
    });

    it('should return undefined when _sections does not exist', () => {
        const interview = {
            response: {}
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(getLastVisitedSection({ interview })).toBeUndefined();
    });
});

describe('isSectionCompleted', () => {
    it('should return true when a section is marked as completed', () => {
        const interview = {
            response: {
                _sections: {
                    'section1': {
                        _isCompleted: true
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'section1' })).toBe(true);
    });

    it('should return false when a section is not marked as completed', () => {
        const interview = {
            response: {
                _sections: {
                    'section1': {
                        _isCompleted: false
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'section1' })).toBe(false);
    });

    it('should return true when a section with iteration context is marked as completed', () => {
        const interview = {
            response: {
                _sections: {
                    'section1': {
                        _isCompleted: true,
                        'person/uuid': {
                            _isCompleted: true
                        },
                        'person/uuid2': {
                            _isCompleted: false
                        }
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'section1', iterationContext: ['person', 'uuid'] })).toBe(true);
    });

    it('should return false when a section with iteration context is not marked as completed', () => {
        const interview = {
            response: {
                _sections: {
                    'section1': {
                        _isCompleted: false,
                        'person/uuid': {
                            _isCompleted: true
                        },
                        'person/uuid2': {
                            _isCompleted: false
                        }
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'section1', iterationContext: ['person', 'uuid2'] })).toBe(false);
    });

    it('should return false when _isCompleted is undefined', () => {
        const interview = {
            response: {
                _sections: {
                    'section1': {}
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'section1' })).toBe(false);
    });

    it('should return false when section does not exist', () => {
        const interview = {
            response: {
                _sections: {}
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'nonExistentSection' })).toBe(false);
    });

    it('should return false when _sections does not exist', () => {
        const interview = {
            response: {}
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'section1' })).toBe(false);
    });

    it('should return false when specific iteration context is not defined', () => {
        const interview = {
            response: {
                _sections: {
                    'section1': {
                        _isCompleted: true,
                        'person/uuid': {
                            _isCompleted: true
                        }
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;
        
        expect(isSectionCompleted({ interview, sectionName: 'section1', iterationContext: ['person', 'uuid3'] })).toBe(false);
    });
});

describe('isIterationContextStarted', () => {
    it('should return true when iteration context is empty', () => {
        const interview = {
            response: {
                _sections: {}
            }
        } as unknown as UserRuntimeInterviewAttributes;

        expect(isIterationContextStarted({ interview, iterationContext: [] })).toBe(true);
    });

    it('should return true when iteration context has started', () => {
        const interview = {
            response: {
                _sections: {
                    section1: {
                        'person/uuid': {
                            _startedAt: 1234567890
                        }
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;

        expect(isIterationContextStarted({ interview, iterationContext: ['person', 'uuid'] })).toBe(true);
    });

    it('should return false when iteration context has not started', () => {
        const interview = {
            response: {
                _sections: {
                    section1: {
                        'person/uuid': {}
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;

        expect(isIterationContextStarted({ interview, iterationContext: ['person', 'uuid'] })).toBe(false);
    });

    it('should return false when iteration context does not exist', () => {
        const interview = {
            response: {
                _sections: {
                    section1: {}
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;

        expect(isIterationContextStarted({ interview, iterationContext: ['person', 'uuid'] })).toBe(false);
    });

    it('should return true when any section for the iteration context has started', () => {
        const interview = {
            response: {
                _sections: {
                    section1: {
                        'person/uuid': {
                            _startedAt: 1234567890
                        }
                    },
                    section2: {
                        'person/uuid2': {
                            _startedAt: 9876543210
                        }
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;

        expect(isIterationContextStarted({ interview, iterationContext: ['person', 'uuid'] })).toBe(true);
    });

    it('should return false when no sections for the iteration context have started', () => {
        const interview = {
            response: {
                _sections: {
                    section1: {
                        'person/uuid': { _startedAt: 1234567890 }
                    },
                    section2: {
                        'person/uuid2': { _startedAt: 1234567890 }
                    }
                }
            }
        } as unknown as UserRuntimeInterviewAttributes;

        expect(isIterationContextStarted({ interview, iterationContext: ['person', 'uuid3'] })).toBe(false);
    });
});
