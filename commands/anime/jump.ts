import { animeMaker } from '#anime';

export default animeMaker({
    command: ['jump'],
    description: 'Salta solo o con alguien',
    soloPhrases: {
        global: ['salta con alegría', 'brinca', 'da un salto', 'salta sin parar']
    },
    togetherPhrases: {
        global: ['salta con', 'brinca junto a', 'da un salto con', 'salta feliz con']
    }
});
