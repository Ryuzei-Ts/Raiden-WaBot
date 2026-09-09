import { animeMaker } from '#anime';

export default animeMaker({
    command: ['wink'],
    description: 'Guiña un ojo a alguien o a sí mismo',
    soloPhrases: {
        global: ['guinña un ojo', 'hace un guiño', 'guiña con picardía', 'un ojo se cierra']
    },
    togetherPhrases: {
        global: ['guinña a', 'hace un guiño a', 'lanza un guiño a', 'guiña con picardía a']
    }
});
