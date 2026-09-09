import { animeMaker } from '#anime';

export default animeMaker({
    command: ['cuddle'],
    description: 'Se acurruca solo o con alguien',
    soloPhrases: {
        global: ['se acurruca', 'se envuelve', 'se arrulla', 'se acurruca solo']
    },
    togetherPhrases: {
        global: ['se acurruca con', 'se arrulla junto a', 'se envuelve con', 'abrazado a']
    }
});
