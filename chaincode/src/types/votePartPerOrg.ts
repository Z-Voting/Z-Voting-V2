import {Object, Property} from 'fabric-contract-api';
import {EncryptedVotePartEntry} from './encryptedVotePartEntry';

@Object()
export class VotePartPerOrg {

    @Property()
    public Org: string;

    @Property('EncryptedVoteParts', 'EncryptedVotePartEntry[]')
    public EncryptedVoteParts: EncryptedVotePartEntry[];

    constructor(Org: string) {
        this.Org = Org;
        this.EncryptedVoteParts = [];
    }
}
