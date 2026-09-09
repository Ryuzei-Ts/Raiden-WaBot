import { animeMaker } from '#anime';

export default animeMaker({
    command: ['smoke', 'fumar'],
    description: 'Fuma solo o con alguien',
    soloPhrases: {
        global: ['fuma tranquilo', 'exhala humo', 'toma un cigarro', 'fuma en silencio']
    },
    togetherPhrases: {
        global: ['fuma con', 'comparte un cigarro con', 'fuma al lado de', 'exhala humo a']
    }
});
