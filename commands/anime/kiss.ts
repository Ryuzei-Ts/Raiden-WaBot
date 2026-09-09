import { animeMaker } from '#anime';

export default animeMaker({
    command: ['kiss', 'muak'],
    description: 'Envía un beso a alguien o a ti mismo',
    soloPhrases: {
        global: ['disfruta de su propio cariño', 'se envuelve en besos', 'se da un beso de ánimo', 'se besa y sonríe']
    },
    togetherPhrases: {
        global: ['dejó un beso en la frente de', 'dio un beso a', 'lanza un beso a', 'besa con pasión a']
    }
});
