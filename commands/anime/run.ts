import { animeMaker } from '#anime';

export default animeMaker({
    command: ['run', 'correr'],
    description: 'Corre solo o con alguien',
    soloPhrases: {
        global: ['corre sin parar', 'huye', 'sale corriendo', 'se escapa']
    },
    togetherPhrases: {
        global: ['corre con', 'huye de', 'escapa junto a', 'corre hacia']
    }
});
