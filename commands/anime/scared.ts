import { animeMaker } from '#anime';

export default animeMaker({
    command: ['scared'],
    description: 'Está asustado solo o por alguien',
    soloPhrases: {
        global: ['está asustado', 'tiembla de miedo', 'se esconde', 'grita de susto']
    },
    togetherPhrases: {
        global: ['se asusta por', 'tiembla al ver a', 'se esconde detrás de', 'grita por culpa de']
    }
});
