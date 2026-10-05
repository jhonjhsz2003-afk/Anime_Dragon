const covers = new Set(['aurora','inferno','nebula','moon']);
const frames = new Set(['flame','crystal','halo','plain']);

export const identityColumns = "COALESCE(pi.cover,'aurora') profile_cover,COALESCE(pi.frame,'flame') profile_frame,COALESCE(pi.title,'Explorador de universos') profile_title";
export const identityJoin = 'LEFT JOIN profile_identity pi ON pi.user_id=users.id';
export const profileIdentity = u => ({cover:covers.has(u.profile_cover)?u.profile_cover:'aurora',frame:frames.has(u.profile_frame)?u.profile_frame:'flame',title:u.profile_title||'Explorador de universos'});

export function validateIdentity(value,current){
 if(value===undefined)return profileIdentity(current);
 if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(new Error('Confira as opções do seu perfil.'),{status:400});
 const prior=profileIdentity(current),cover=value.cover??prior.cover,frame=value.frame??prior.frame;
 const title=String(value.title??prior.title).trim();
 if(!covers.has(cover)||!frames.has(frame)||title.length<2||title.length>40||/[<>\u0000-\u001f]/u.test(title))throw Object.assign(new Error('Escolha uma capa e uma moldura disponíveis e um título de 2 a 40 caracteres.'),{status:400});
 return {cover,frame,title};
}
