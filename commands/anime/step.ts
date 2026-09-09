import { animeMaker } from '#anime';

export default animeMaker({
    command: ['step', 'pisar'],
    description: 'Pisa a alguien o algo accidentalmente',
    soloPhrases: {
        global: ['pisa fuerte', 'da un paso', 'camina con paso firme', 'pisa el suelo']
    },
    togetherPhrases: {
        global: ['pisa a', 'le pisa el pie a', 'da un paso sobre', 'pisa sin querer a']
    }
});
