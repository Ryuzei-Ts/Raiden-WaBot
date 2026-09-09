import { animeMaker } from '#anime';

export default animeMaker({
    command: ['laugh'],
    description: 'Ríe solo o con alguien',
    soloPhrases: {
        global: ['ríe a carcajadas', 'se ríe sin parar', 'ríe con ganas', 'su risa se escucha']
    },
    togetherPhrases: {
        global: ['ríe con', 'comparte risas con', 'se ríe junto a', 'ríe por culpa de']
    }
});
