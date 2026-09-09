import { animeMaker } from '#anime';

export default animeMaker({
    command: ['drunk'],
    description: 'Está borracho solo o con alguien',
    soloPhrases: {
        global: ['está borracho', 'camina tambaleando', 'bebe sin control', 'está ebrio']
    },
    togetherPhrases: {
        global: ['se embriaga con', 'bebe junto a', 'se pone borracho con', 'comparte tragos con']
    }
});
