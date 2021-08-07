import {Object, Property} from 'fabric-contract-api';
import NodeRSA from 'node-rsa';
import {VotePart} from './votePart';

@Object()
export class EncryptedVotePartEntry {

    public static from(votePart: VotePart, key: NodeRSA) {
        const encryptedVotePart = key.encrypt(JSON.stringify(votePart), 'base64');
        return new EncryptedVotePartEntry(votePart.VotePartNumber, encryptedVotePart);
    }

    @Property()
    public VotePartNumber: number;

    @Property()
    public EncryptedVotePart: string;

    public constructor(VotePartNumber: number, VotePartData: string) {
        this.VotePartNumber = VotePartNumber;
        this.EncryptedVotePart = VotePartData;
    }

    public decrypt(key: NodeRSA) {
        const {
            VoteRandomId,
            VotePartNumber,
            Data,
        } = JSON.parse(key.decrypt(this.EncryptedVotePart, 'utf8')) as VotePart;

        return new VotePart(VoteRandomId, VotePartNumber, Data);
    }
}
