import NodeRSA from 'node-rsa';
import {VotePart} from './votePart';

export class EncryptedVotePartEntry {

    public static from(votePart: VotePart, key: NodeRSA) {
        const encryptedVotePart = key.encrypt(JSON.stringify(votePart), 'base64');
        return new EncryptedVotePartEntry(votePart.VotePartNumber, encryptedVotePart);
    }

    public VotePartNumber: number;
    public EncryptedVotePart: string;

    private constructor(VotePartNumber: number, VotePartData: string) {
        this.VotePartNumber = VotePartNumber;
        this.EncryptedVotePart = VotePartData;
    }

    public decrypt(key: NodeRSA) {
        return JSON.parse(key.decrypt(this.EncryptedVotePart, 'utf8')) as VotePart;
    }
}
