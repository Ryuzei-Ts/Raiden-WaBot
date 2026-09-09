import { animeMaker } from '#anime';

export default animeMaker({
    command: ['drunk'],
    description: 'Está borracho solo o con alguien',
    soloPhrases: {
        hombre: ['está borracho', 'camina tambaleando', 'bebe sin control', 'está ebrio'],
        mujer: ['está borracha', 'camina tambaleando', 'bebe sin control', 'está ebria'],
        otro: ['está borrache', 'camina tambaleando', 'bebe sin control', 'está ebrie'],
        indefinido: ['está borrach@', 'camina tambaleando', 'bebe sin control', 'está ebrio']
    },
    togetherPhrases: {
        hombre: ['se embriaga con', 'bebe junto a', 'se pone borracho con', 'comparte tragos con'],
        mujer: ['se embriaga con', 'bebe junto a', 'se pone borracha con', 'comparte tragos con'],
        otro: ['se embriaga con', 'bebe junto a', 'se pone borrache con', 'comparte tragos con'],
        indefinido: ['se embriaga con', 'bebe junto a', 'se pone borracho con', 'comparte tragos con']
    }
});
