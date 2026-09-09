import { animeMaker } from '#anime';

export default animeMaker({
    command: ['hug', 'abrazo'],
    description: 'Envía un abrazo a alguien o a ti mismo',
    soloPhrases: {
        global: ['se abraza con fuerza', 'se envuelve en sus brazos', 'se da un abrazo de consuelo', 'se abraza y cierra los ojos']
    },
    togetherPhrases: {
        global: ['abraza con amor a', 'da un abrazo fuerte a', 'envuelve en sus brazos a', 'abraza tiernamente a']
    }
});
