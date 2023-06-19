import each from 'jest-each';
import { getPathForSection } from '../url';

each([
    [ 'survey/home', 'survey/newSection' ],
    [ '/survey/home', '/survey/newSection' ],
    [ '/edit/uuid/survey/home', '/edit/uuid/survey/newSection' ],
    [ 'edit/uuid/survey/home', 'edit/uuid/survey/newSection' ],
    [ 'survey/newSection', false ],
    [ '/survey/newSection', false ],
    [ '/admin/survey/uuid', false ],
    [ 'edit/uuid/survey/newSection', false ],
]).test('Get path for section: %s', async(currentPath, expected) => {
    expect(getPathForSection(currentPath, 'newSection')).toEqual(expected);
});