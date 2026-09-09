import { animeMaker } from '#anime';

export default animeMaker({
    command: ['coffee', 'cafe'],
    description: 'Toma café solo o con alguien',
    soloPhrases: {
        global: ['toma café', 'disfruta de su café', 'saborea el café', 'bebe café con calma']
    },
    togetherPhrases: {
        global: ['toma café con', 'comparte café con', 'invita un café a', 'disfruta café con']
    }
});
