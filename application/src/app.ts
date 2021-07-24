var crypto = require('crypto');
const BlindSignature = require('blind-signatures');
const NodeRSA = require('node-rsa');

import {Gateway, GatewayOptions} from 'fabric-network';
import * as path from 'path';
import {buildCCPOrg1, buildWallet} from './utils/AppUtil';
import {buildCAClient, enrollAdmin, registerAndEnrollUser} from './utils/CAUtil';

const channelName = 'zvoting';
const chaincodeName = 'zvoting';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

async function main() {
    try {
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient = buildCAClient(ccp, 'ca.org1.example.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(walletPath);

        // in a real application this would be done on an administrative flow, and only once
        await enrollAdmin(caClient, wallet, mspOrg1);

        // in a real application this would be done only when a new user was required to be added
        // and would be part of an administrative flow
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1', [
            {name: `${mspOrg1}.admin`, value: 'true', ecert: true},
            {name: 'election.judge', value: 'true', ecert: true},
            {name: 'election.creator', value: 'true', ecert: true},
        ]);

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        const gateway = new Gateway();

        const gatewayOpts: GatewayOptions = {
            wallet,
            identity: org1UserId,
            discovery: {enabled: true, asLocalhost: true}, // using asLocalhost as this gateway is using a fabric network deployed locally
        };

        try {
            // setup the gateway instance
            // The user will now be able to create connections to the fabric network and be able to
            // submit transactions and query. All transactions submitted by this gateway will be
            // signed by this user using the credentials stored in the wallet.
            await gateway.connect(ccp, gatewayOpts);

            // Build a network instance based on the channel where the smart contract is deployed
            const network = await gateway.getNetwork(channelName);

            // Get the contract from the network.
            const contract = network.getContract(chaincodeName);

            const electionId = Math.floor(Math.random() * 10000);

            // Create election
            try {
                console.log('\n--> Submit Transaction: CreateElection');
                await contract.submitTransaction('CreateElection', `${electionId}`, `election ${electionId}`);
                console.log('*** Result: election created');
            } catch (e) {
                console.error(e.toString());
            }

            // Publish Identity
            try {
                const key = BlindSignature.keyGeneration({b: 2048});

                const privateKey = key.exportKey('pkcs8').toString();
                console.log('\n');
                console.log(privateKey);
                console.log('\n');

                const n = key.keyPair.n.toString();
                const e = key.keyPair.e.toString();

                // console.log(key.keyPair);

                const collectionKey = `privateKey_${mspOrg1}`;

                // Get Private Endorsement Right
                // try {
                //     console.log('\n--> Submit Transaction: AcquirePrivateEndorsementRight');
                //     console.error(`key: ${collectionKey}`);
                //     await contract.submitTransaction('AcquirePrivateEndorsementRight', collectionKey);
                //     console.log('*** Result: AcquirePrivateEndorsementRight succeeded');
                // } catch (e) {
                //     console.error(e.toString());
                // }

                // Save Private Key
                try {
                    console.log('\n--> Submit Transaction: saveImplicitPrivateData (Private Key)');
                    await contract.createTransaction('SaveImplicitPrivateData')
                        .setTransient({
                            data: Buffer.from(privateKey),
                        })
                        .setEndorsingOrganizations(mspOrg1)
                        .submit(collectionKey);
                    console.log('*** Result: saveImplicitPrivateData succeeded');
                } catch (e) {
                    console.error(e.toString());
                }

                // Fetch Private Key
                try {
                    console.log('\n--> Evaluate Transaction: GetImplicitPrivateData');
                    const result = await contract.evaluateTransaction('GetImplicitPrivateData', collectionKey);
                    console.log(`*** Result: ${result}`);
                } catch (e) {
                    console.error(e.toString());
                }

                console.log('\n--> Submit Transaction: PublishIdentity');
                await contract.submitTransaction('PublishIdentity', n, e, crypto.createHash('sha256').update(Buffer.from(privateKey)).digest('base64'));
                console.log('*** Result: Identity Published');

                console.log('\n--> Evaluate Transaction: FetchIdentity');
                const result = await contract.evaluateTransaction('FetchIdentity', mspOrg1);
                console.log(`*** Result: ${result}`);

            } catch (e) {
                console.error(e.toString());
            }

            // Judge Proposal Submitted
            try {
                console.log('\n--> Submit Transaction: AddJudgeProposal');
                await contract.submitTransaction('AddJudgeProposal', electionId.toString());
                console.log('*** Result: AddJudgeProposal succeeded');
            } catch (e) {
                console.error(e.toString());
            }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', 'Candidate A', 'PartyACandidateA', `election${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            // One candidate is added
            try {
                console.log('\n--> Submit Transaction: AddCandidate');
                await contract.submitTransaction('AddCandidate', 'Candidate B', 'PartyBCandidateB', `${electionId}`);
                console.log('*** Result: Candidate Added');
            } catch (e) {
                console.error(e.toString());
            }

            try {
                console.log('\n--> Evaluate Transaction: DuplicateCandidateExists');
                const result = await contract.evaluateTransaction('DuplicateCandidateExists', 'PartyBCandidateB', `${electionId}`);
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Get Elections
            try {
                console.log('\n--> Evaluate Transaction: GetElections');
                const result = await contract.evaluateTransaction('GetElections');
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Get Election Candidates
            try {
                console.log('\n--> Evaluate Transaction: GetCandidates');
                const result = await contract.evaluateTransaction('GetCandidates', `${electionId}`);
                console.log(`*** Result: ${result}`);
            } catch (e) {
                console.error(e.toString());
            }

            // Election is started
            try {
                console.log('\n--> Submit Transaction: StartElection');
                await contract.submitTransaction('StartElection', `election${electionId}`);
                console.log('*** Result: election started');
            } catch (e) {
                console.error(e.toString());
            }

        } finally {
            // Disconnect from the gateway when the application is closing
            // This will close all connections to the network
            gateway.disconnect();
        }
    } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`);
    }
}

main()
    .then(() => console.log('Successfully executed app'))
    .catch((reason) => console.error(`Error: ${reason.toString()}`));
