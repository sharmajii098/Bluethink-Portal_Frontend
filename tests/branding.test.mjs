import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout=readFileSync(new URL('../src/components/AppLayout.tsx',import.meta.url),'utf8');
const roleCss=readFileSync(new URL('../src/styles/v25_3-role-identity.css',import.meta.url),'utf8');
const legacyCss=readFileSync(new URL('../src/styles/v19-distinct-roles.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');

test('all four roles use the same prominent original BlueThink company logo',()=>{
 assert.match(layout,/src=\{officialLogo\} alt="BlueThink Inc\. — Think beyond"/);
 assert.match(layout,/className="bt-official-brand-logo bt-official-brand-original"/);
 assert.doesNotMatch(layout,/bt-role-official-signature/);
 assert.match(legacyCss,/\.bt-studio \.bt-official-brand-logo \{[\s\S]*?max-width:220px!important;/);
 assert.doesNotMatch(roleCss,/opacity\s*:\s*\.42|width\s*:\s*34px!important|bt-role-official-signature/);
});

test('four distinct role icons stay in the profile badge without an extra sidebar panel',()=>{
 for(const component of ['AdminPanelSettingsRoundedIcon','SupervisorAccountRoundedIcon','Diversity3RoundedIcon','BadgeRoundedIcon']) assert.ok(layout.includes(component),`Missing ${component}`);
 for(const role of ['ADMIN','MANAGER','HR','EMPLOYEE']) assert.match(layout,new RegExp(`${role}: (AdminPanelSettingsRoundedIcon|SupervisorAccountRoundedIcon|Diversity3RoundedIcon|BadgeRoundedIcon)`));
 assert.match(layout,/className=\{`th-role-badge th-role-\$\{role\.toLowerCase\(\)\} bt-inline-role-badge`\}/);
 assert.match(layout,/<RoleMark fontSize="inherit" aria-hidden="true" \/>/);
 assert.ok(layout.indexOf('<img className="bt-official-brand-logo')<layout.indexOf('className="th-profile th-profile-v6"'),'The original brand must come before profile information');
});

test('remove Control Room and equivalent extra sidebar content for every role',()=>{
 assert.doesNotMatch(layout,/bt19-sidebar-context|ROLE_THEME_META|roleMeta|CONTROL ROOM|PEOPLE STUDIO|TEAM DESK|PERSONAL HUB/);
 assert.doesNotMatch(roleCss,/bt19-sidebar-context|bt-role-context-copy|bt-role-marker/);
 assert.doesNotMatch(legacyCss,/bt19-sidebar-context/);
 assert.match(layout,/<img className="bt-official-brand-logo/);
 assert.match(layout,/className="th-profile th-profile-v6"/);
});

test('new role stylesheet is loaded and previous miniature logo stylesheet is not',()=>{
 assert.match(main,/v25_3-role-identity\.css/);
 assert.doesNotMatch(main,/v25_2-role-marks\.css/);
});
