import { animeMaker } from '#anime';

export default animeMaker({
    command: ['punch', 'pegar'],
    description: 'Golpea a alguien o a ti mismo',
    soloPhrases: {
        global: ['lanza un puñetazo al aire', 'golpea con fuerza', 'se da un golpe', 'golpea la pared']
    },
    togetherPhrases: {
        global: ['le da un puñetazo a', 'golpea con fuerza a', 'le da un golpe a', 'lanza un golpe a']
    }
});
