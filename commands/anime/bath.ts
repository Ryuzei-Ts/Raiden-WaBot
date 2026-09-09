import { animeMaker } from '#anime';

export default animeMaker({
    command: ['bath'],
    description: 'Se baña solo o con alguien',
    soloPhrases: {
        global: ['se baña', 'se ducha', 'se relaja en el agua', 'disfruta del baño']
    },
    togetherPhrases: {
        global: ['baña a', 'comparte baño con', 'se baña junto a', 'lava a']
    }
});
