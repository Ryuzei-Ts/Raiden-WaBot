import { animeMaker } from '#anime';

export default animeMaker({
    command: ['blush'],
    description: 'Se sonroja por alguien o por algo',
    soloPhrases: {
        global: ['se sonroja', 'sus mejillas se tiñen de rojo', 'se ruboriza', 'el rubor cubre su rostro']
    },
    togetherPhrases: {
        global: ['se sonroja por', 'se ruboriza al ver a', 'sus mejillas se sonrojan por', 'se pone rojo por']
    }
});
