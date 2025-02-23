import React, { useEffect, useRef, useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import DialogForm from './DialogForm';
import {
  useWallet,
  useWalletAddressForMint,
  useWalletPublicKeys, useWalletPublicKeysMints,
  useWalletPublicKeysSymbol,
  useWalletTokenAccounts
} from '../utils/wallet';
import { PublicKey } from '@solana/web3.js';
import { abbreviateAddress } from '../utils/utils';
import InputAdornment from '@material-ui/core/InputAdornment';
import { useCallAsync, useSendTransaction } from '../utils/notifications';
import { swapApiRequest, useSwapApiGet } from '../utils/swap/api';
import { showSwapAddress } from '../utils/config';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import DialogContentText from '@material-ui/core/DialogContentText';
import {
  ConnectToMetamaskButton,
  getErc20Balance,
  useEthAccount,
  withdrawEth,
} from '../utils/swap/eth';
import {useConnection, useConnectionConfig, useIsProdNetwork} from '../utils/connection';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import { useAsyncData } from '../utils/fetch-loop';
import CircularProgress from '@material-ui/core/CircularProgress';
import {
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from '../utils/tokens/instructions';
import { parseTokenAccountData } from '../utils/tokens/data';
import { Switch, Tooltip } from '@material-ui/core';
import { EthFeeEstimate } from './EthFeeEstimate';
import CSVReader from 'react-csv-reader'
import {getTokenInfo, useTokenInfos} from "../utils/tokens/names";


const timeout = ms => new Promise(res => setTimeout(res, ms));


const WUSDC_MINT = new PublicKey(
    'BXXkv6z8ykpG1yuvUDPgh732wzVHB69RnB9YgSYh3itW',
);
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const WUSDT_MINT = new PublicKey(
    'BQcdHdAQW1hczDbBi9hiegXAR7A98Q9jx3X3iBBBDiq4',
);

const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');

export default function SendDialog({ open, onClose, publicKey, balanceInfo }) {
  const isProdNetwork = useIsProdNetwork();
  const [tab, setTab] = useState('spl');

  const onSubmitRef = useRef();

  const [swapCoinInfo] = useSwapApiGet(
      showSwapAddress && balanceInfo.mint && isProdNetwork
          ? `coins/sol/${balanceInfo.mint.toBase58()}`
          : null,
  );
  const ethAccount = useEthAccount();

  const { mint, tokenName, tokenSymbol } = balanceInfo;

  const getTabs = (mint) => {
    if (mint?.equals(WUSDC_MINT)) {
      return [
        <Tab label="SPL WUSDC" key="spl" value="spl" />,
        <Tab label="SPL USDC" key="wusdcToSplUsdc" value="wusdcToSplUsdc" />,
        <Tab label="ERC20 USDC" key="swap" value="swap" />,
      ];
    } else if (mint?.equals(WUSDT_MINT)) {
      return [
        <Tab label="SPL WUSDT" key="spl" value="spl" />,
        <Tab label="SPL USDT" key="wusdtToSplUsdt" value="wusdtToSplUsdt" />,
        <Tab label="ERC20 USDT" key="swap" value="swap" />,
      ];
    } else if (localStorage.getItem('sollet-private') && mint?.equals(USDC_MINT)) {
      return [
        <Tab label="SPL USDC" key="spl" value="spl" />,
        <Tab label="SPL WUSDC" key="usdcToSplWUsdc" value="usdcToSplWUsdc" />,
        <Tab label="ERC20 USDC" key="swap" value="swap" />,
      ];
    } else {
      return [
        <Tab label={`SPL ${swapCoinInfo.ticker}`} key="spl" value="spl" />,
        <Tab
            label={`${swapCoinInfo.erc20Contract ? 'ERC20' : 'Native'} ${
                swapCoinInfo.ticker
            }`}
            key="swap"
            value="swap"
        />,
      ];
    }
  };

  return (
      <>
        <DialogForm
            open={open}
            onClose={onClose}
            onSubmit={() => onSubmitRef.current()}
            fullWidth
        >
          <DialogTitle>
            Send {tokenName }
            {tokenSymbol }
            {ethAccount && (
                <div>
                  <Typography color="textSecondary" style={{ fontSize: '14px' }}>
                    Metamask connected: {ethAccount}
                  </Typography>
                </div>
            )}
          </DialogTitle>
          {swapCoinInfo ? (
              <Tabs
                  value={tab}
                  variant="fullWidth"
                  onChange={(e, value) => setTab(value)}
                  textColor="primary"
                  indicatorColor="primary"
              >
                {getTabs(mint)}
              </Tabs>
          ) : null}

          {tab === 'spl' ? (
              <SendSplDialog
                  onClose={onClose}
                  publicKey={publicKey}
                  balanceInfo={balanceInfo}
                  onSubmitRef={onSubmitRef}
              />
          ) : tab === 'wusdcToSplUsdc' ? (
              <SendSwapDialog
                  key={tab}
                  onClose={onClose}
                  publicKey={publicKey}
                  balanceInfo={balanceInfo}
                  swapCoinInfo={swapCoinInfo}
                  onSubmitRef={onSubmitRef}
                  wusdcToSplUsdc
              />
          ) : tab === 'wusdtToSplUsdt' ? (
              <SendSwapDialog
                  key={tab}
                  onClose={onClose}
                  publicKey={publicKey}
                  balanceInfo={balanceInfo}
                  swapCoinInfo={swapCoinInfo}
                  onSubmitRef={onSubmitRef}
                  wusdtToSplUsdt
              />
          ) : tab === 'usdcToSplWUsdc' ? (
              <SendSwapDialog
                  key={tab}
                  onClose={onClose}
                  publicKey={publicKey}
                  balanceInfo={balanceInfo}
                  swapCoinInfo={swapCoinInfo}
                  onSubmitRef={onSubmitRef}
                  usdcToSplWUsdc
              />
          ) : (
              <SendSwapDialog
                  key={tab}
                  onClose={onClose}
                  publicKey={publicKey}
                  balanceInfo={balanceInfo}
                  swapCoinInfo={swapCoinInfo}
                  ethAccount={ethAccount}
                  onSubmitRef={onSubmitRef}
              />
          )}
        </DialogForm>

      </>
  );
}

function SendSplDialog({ onClose, publicKey, balanceInfo, onSubmitRef }) {
  const defaultAddressHelperText =
      !balanceInfo.mint || balanceInfo.mint.equals(WRAPPED_SOL_MINT)
          ? 'Enter Solana Address'
          : 'Enter SPL token or Solana address';
  const wallet = useWallet();

  const [sendTransaction, sending] = useSendTransaction();
  const [walletAccounts] = useWalletTokenAccounts();
  const [kz,loaded1] = useWalletPublicKeysSymbol();
  const [mints,loaded2] = useWalletPublicKeysMints();
  const [keys, loaded] = useWalletPublicKeys();
  const [csv, setCsv] = useState([]);
  const [splitCsv, setSplitCsv] = useState([]);
  const [csvIndex, setCsvIndex] = useState(0);
  const [addressHelperText, setAddressHelperText] = useState(
      defaultAddressHelperText,
  );
  const [passValidation, setPassValidation] = useState();
  const [overrideDestinationCheck, setOverrideDestinationCheck] = useState(
      false,
  );
  const [shouldShowOverride, setShouldShowOverride] = useState();
  const {
    fields,
    destinationAddress,
    transferAmountString,
    validAmount,
  } = useForm(balanceInfo, addressHelperText, passValidation);
  const { decimals, mint } = balanceInfo;
  const mintString = mint && mint.toBase58();

  useEffect(() => {
    (async () => {
      if (!destinationAddress) {
        setAddressHelperText(defaultAddressHelperText);
        setPassValidation(undefined);
        setShouldShowOverride(undefined);
        return;
      }
      try {
        const destinationAccountInfo = await wallet.connection.getAccountInfo(
            new PublicKey(destinationAddress),
        );
        setShouldShowOverride(false);

        if (destinationAccountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
          const accountInfo = parseTokenAccountData(
              destinationAccountInfo.data,
          );
          if (accountInfo.mint.toBase58() === mintString) {
            setPassValidation(true);
            setAddressHelperText('Address is a valid SPL token address');
          } else {
            setPassValidation(false);
            setAddressHelperText('Destination address mint does not match');
          }
        } else {
          setPassValidation(true);
          setAddressHelperText('Destination is a Solana address');
        }
      } catch (e) {
        console.log(`Received error validating address ${e}`);
        setAddressHelperText(defaultAddressHelperText);
        setShouldShowOverride(true);
        setPassValidation(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationAddress, wallet, mintString]);

  useEffect(() => {
    return () => {
      setOverrideDestinationCheck(false);
    };
  }, [setOverrideDestinationCheck]);


  async function makeTransaction2(address,qt,key,mint) {
    let amount = Math.round(parseFloat(qt) * 10 ** decimals);
    console.log(amount);
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    console.log("COIN");
    console.log(publicKey.address);
    console.log(publicKey);
    console.log(publicKey.toBase58());
    return wallet.transferToken(
        key,
        new PublicKey(address),
        amount,
        mint,
        decimals,
        null,
        overrideDestinationCheck,
    );
  }

  async function makeTransaction() {
    let amount = Math.round(parseFloat(transferAmountString) * 10 ** decimals);
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    return wallet.transferToken(
        publicKey,
        new PublicKey(destinationAddress),
        amount,
        balanceInfo.mint,
        decimals,
        null,
        overrideDestinationCheck,
    );
  }

  const disabled = shouldShowOverride
      ? !overrideDestinationCheck || sending || !validAmount
      : sending || !validAmount;

  async function onSubmit() {
    return sendTransaction(makeTransaction(), { onSuccess: onClose });
  }


  async function bulkSend() {
    csv.map(line => {
      try {
        setTimeout(async () => {
          let [address,amount,coin] = line.map(l => {return l.trim()});

          coin = coin.toUpperCase();
          
          let key = kz[coin];
          let mint = mints[coin];

          if (!address.toLowerCase().startsWith('0x')) {
            console.log('txn executing  for ', address);
            await sendTransactionAuto(address,amount,key,coin,mint);
            console.log('txn executed for ', address);
          }
        }, 2000)
      } catch (e) {
        console.log('problem with address ', e);
      }
    })

  }

  useEffect(() => {
    bulkSend();
  }, [csv]);


  async function sendTransactionAuto(address,qt,key,coin,mint){

    return await sendTransaction(makeTransaction2(address,qt,key,mint), { onSuccess: onClose }, address+' - '+qt +" " +coin+ '\n');

  }


  onSubmitRef.current = onSubmit;
  return (
      <>
        <DialogContent>{fields}</DialogContent>
        <DialogActions>
          {shouldShowOverride && (
              <div
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    textAlign: 'left',
                  }}
              >
                <b>This address has no funds. Are you sure it's correct?</b>
                <Switch
                    checked={overrideDestinationCheck}
                    onChange={(e) => setOverrideDestinationCheck(e.target.checked)}
                    color="primary"
                />
              </div>
          )}
          <b>Distributor will start automatically after csv file selected</b>
          <CSVReader onFileLoaded={(data, fileInfo) =>  setCsv(data)  } />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" color="primary" disabled={disabled}>
            Send
          </Button>
        </DialogActions>
      </>
  );
}

function SendSwapDialog({
                          onClose,
                          publicKey,
                          balanceInfo,
                          swapCoinInfo,
                          ethAccount,
                          wusdcToSplUsdc = false,
                          wusdtToSplUsdt = false,
                          usdcToSplWUsdc = false,
                          onSubmitRef,
                        }) {
  const wallet = useWallet();

  const [sendTransaction, sending] = useSendTransaction();
  const [signature, setSignature] = useState(null);
  const {
    fields,
    destinationAddress,
    transferAmountString,
    setDestinationAddress,
    validAmount,
  } = useForm(balanceInfo);

  const { tokenName, decimals, mint } = balanceInfo;
  const blockchain =
      wusdcToSplUsdc || wusdtToSplUsdt || usdcToSplWUsdc
          ? 'sol'
          : swapCoinInfo.blockchain === 'sol'
              ? 'eth'
              : swapCoinInfo.blockchain;
  const needMetamask = blockchain === 'eth';

  const [ethBalance] = useAsyncData(
      () => getErc20Balance(ethAccount),
      'ethBalance',
      {
        refreshInterval: 2000,
      },
  );
  const ethFeeData = useSwapApiGet(
      blockchain === 'eth' &&
      `fees/eth/${ethAccount}` +
      (swapCoinInfo.erc20Contract ? '/' + swapCoinInfo.erc20Contract : ''),
      { refreshInterval: 2000 },
  );
  const [ethFeeEstimate] = ethFeeData;
  const insufficientEthBalance =
      typeof ethBalance === 'number' &&
      typeof ethFeeEstimate === 'number' &&
      ethBalance < ethFeeEstimate;

  useEffect(() => {
    if (blockchain === 'eth' && ethAccount) {
      setDestinationAddress(ethAccount);
    }
  }, [blockchain, ethAccount, setDestinationAddress]);

  let splUsdcWalletAddress = useWalletAddressForMint(
      wusdcToSplUsdc ? USDC_MINT : null,
  );
  let splUsdtWalletAddress = useWalletAddressForMint(
      wusdtToSplUsdt ? USDT_MINT : null,
  );
  let splWUsdcWalletAddress = useWalletAddressForMint(
      usdcToSplWUsdc ? WUSDC_MINT : null,
  );
  useEffect(() => {
    if (wusdcToSplUsdc && splUsdcWalletAddress) {
      setDestinationAddress(splUsdcWalletAddress);
    } else if (wusdtToSplUsdt && splUsdtWalletAddress) {
      setDestinationAddress(splUsdtWalletAddress);
    } else if (usdcToSplWUsdc && splWUsdcWalletAddress) {
      setDestinationAddress(splWUsdcWalletAddress);
    }
  }, [
    setDestinationAddress,
    wusdcToSplUsdc,
    splUsdcWalletAddress,
    wusdtToSplUsdt,
    splUsdtWalletAddress,
    usdcToSplWUsdc,
    splWUsdcWalletAddress,
  ]);

  async function makeTransaction() {
    let amount = Math.round(parseFloat(transferAmountString) * 10 ** decimals);
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    const params = {
      blockchain,
      address: destinationAddress,
      size: amount / 10 ** decimals,
    };
    if (blockchain === 'sol') {
      params.coin = swapCoinInfo.splMint;
    } else if (blockchain === 'eth') {
      params.coin = swapCoinInfo.erc20Contract;
    }
    if (mint?.equals(WUSDC_MINT)) {
      params.wusdcToUsdc = true;
    } else if (mint?.equals(USDC_MINT)) {
      if (usdcToSplWUsdc) {
        params.usdcToWUsdc = true;
        params.coin = WUSDC_MINT.toString();
      }
    } else if (mint?.equals(WUSDT_MINT)) {
      params.wusdtToUsdt = true;
    }
    const swapInfo = await swapApiRequest('POST', 'swap_to', params);
    if (swapInfo.blockchain !== 'sol') {
      throw new Error('Unexpected blockchain');
    }
    return wallet.transferToken(
        publicKey,
        new PublicKey(swapInfo.address),
        amount,
        balanceInfo.mint,
        decimals,
        swapInfo.memo,
    );
  }

  async function onSubmit() {
    return sendTransaction(makeTransaction(), { onSuccess: setSignature });
  }
  onSubmitRef.current = onSubmit;

  if (signature) {
    return (
        <SendSwapProgress
            key={signature}
            publicKey={publicKey}
            signature={signature}
            blockchain={blockchain}
            onClose={onClose}
        />
    );
  }

  let sendButton = (
      <Button
          type="submit"
          color="primary"
          disabled={
            sending ||
            (needMetamask && !ethAccount) ||
            !validAmount ||
            insufficientEthBalance
          }
      >
        Send
      </Button>
  );

  if (insufficientEthBalance) {
    sendButton = (
        <Tooltip
            title="Insufficient ETH for withdrawal transaction fee"
            placement="top"
        >
          <span>{sendButton}</span>
        </Tooltip>
    );
  }

  return (
      <>
        <DialogContent style={{ paddingTop: 16 }}>
          <DialogContentText>
            SPL {tokenName} can be converted to{' '}
            {blockchain === 'eth' && swapCoinInfo.erc20Contract
                ? 'ERC20'
                : blockchain === 'sol' && swapCoinInfo.splMint
                    ? 'SPL'
                    : 'native'}{' '}
            {swapCoinInfo.ticker}
            {needMetamask ? ' via MetaMask' : null}.
          </DialogContentText>
          {blockchain === 'eth' && (
              <DialogContentText>
                Estimated withdrawal transaction fee:
                <EthFeeEstimate
                    ethFeeData={ethFeeData}
                    insufficientEthBalance={insufficientEthBalance}
                />
              </DialogContentText>
          )}
          {needMetamask && !ethAccount ? <ConnectToMetamaskButton /> : fields}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          {sendButton}
        </DialogActions>
      </>
  );
}

function SendSwapProgress({ publicKey, signature, onClose, blockchain }) {
  const connection = useConnection();
  const [swaps] = useSwapApiGet(`swaps_from/sol/${publicKey.toBase58()}`, {
    refreshInterval: 1000,
  });
  const [confirms] = useAsyncData(
      async () => {
        const { value } = await connection.getSignatureStatus(signature);
        return value?.confirmations;
      },
      [connection.getSignatureStatus, signature],
      { refreshInterval: 2000 },
  );

  let step = 1;
  let ethTxid = null;
  for (let swap of swaps || []) {
    const { deposit, withdrawal } = swap;
    if (deposit.txid === signature) {
      if (withdrawal.txid?.startsWith('0x')) {
        step = 3;
        ethTxid = withdrawal.txid;
      } else if (withdrawal.txid && blockchain !== 'eth') {
        step = 3;
      } else {
        step = 2;
      }
    }
  }

  return (
      <>
        <DialogContent>
          <Stepper activeStep={step}>
            <Step>
              <StepLabel>Send Request</StepLabel>
            </Step>
            <Step>
              <StepLabel>Wait for Confirmations</StepLabel>
            </Step>
            <Step>
              <StepLabel>Withdraw Funds</StepLabel>
            </Step>
          </Stepper>
          {ethTxid ? (
              <Typography variant="body2" align="center">
                <Link
                    href={`https://etherscan.io/tx/${ethTxid}`}
                    target="_blank"
                    rel="noopener"
                >
                  View on Etherscan
                </Link>
              </Typography>
          ) : step < 3 ? (
              <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
              >
                <div style={{ marginRight: 16 }}>
                  <CircularProgress />
                </div>
                {confirms ? (
                    <Typography>{confirms} / 35 Confirmations</Typography>
                ) : (
                    <Typography>Transaction Pending</Typography>
                )}
              </div>
          ) : null}
          {!ethTxid && blockchain === 'eth' ? (
              <DialogContentText style={{ marginTop: 16, marginBottom: 0 }}>
                Please keep this window open. You will need to approve the request
                on MetaMask to complete the transaction.
              </DialogContentText>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </>
  );
}

function useForm(
    balanceInfo,
    addressHelperText,
    passAddressValidation,
    overrideValidation,
) {
  const [destinationAddress, setDestinationAddress] = useState('');
  const [transferAmountString, setTransferAmountString] = useState('');
  const { amount: balanceAmount, decimals, tokenSymbol } = balanceInfo;

  const parsedAmount = parseFloat(transferAmountString) * 10 ** decimals;
  const validAmount = parsedAmount > 0 && parsedAmount <= balanceAmount;

  const fields = (
      <>
        <TextField
            label="Recipient Address"
            fullWidth
            variant="outlined"
            margin="normal"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value.trim())}
            helperText={addressHelperText}
            id={
              !passAddressValidation && passAddressValidation !== undefined
                  ? 'outlined-error-helper-text'
                  : undefined
            }
            error={!passAddressValidation && passAddressValidation !== undefined}
        />
        <TextField
            label="Amount"
            fullWidth
            variant="outlined"
            margin="normal"
            type="number"
            InputProps={{
              endAdornment: (
                  <InputAdornment position="end">
                    <Button
                        onClick={() =>
                            setTransferAmountString(
                                balanceAmountToUserAmount(balanceAmount, decimals),
                            )
                        }
                    >
                      MAX
                    </Button>
                    {tokenSymbol ? tokenSymbol : null}
                  </InputAdornment>
              ),
              inputProps: {
                step: Math.pow(10, -decimals),
              },
            }}
            value={transferAmountString}
            onChange={(e) => setTransferAmountString(e.target.value.trim())}
            helperText={
              <span
                  onClick={() =>
                      setTransferAmountString(
                          balanceAmountToUserAmount(balanceAmount, decimals),
                      )
                  }
              >
            Max: {balanceAmountToUserAmount(balanceAmount, decimals)}
          </span>
            }
        />
      </>
  );

  return {
    fields,
    destinationAddress,
    transferAmountString,
    setDestinationAddress,
    validAmount,
  };
}

function balanceAmountToUserAmount(balanceAmount, decimals) {
  return (balanceAmount / Math.pow(10, decimals)).toFixed(decimals);
}

function EthWithdrawalCompleter({ ethAccount, publicKey }) {
  const [swaps] = useSwapApiGet(`swaps_from/sol/${publicKey.toBase58()}`, {
    refreshInterval: 10000,
  });
  if (!swaps) {
    return null;
  }
  return swaps.map((swap) => (
      <EthWithdrawalCompleterItem
          key={swap.deposit.txid}
          ethAccount={ethAccount}
          swap={swap}
      />
  ));
}

function EthWithdrawalCompleterItem({ ethAccount, swap }) {
  const callAsync = useCallAsync();
  const { withdrawal } = swap;
  useEffect(() => {
    if (
        withdrawal.status === 'sent' &&
        withdrawal.blockchain === 'eth' &&
        withdrawal.txid &&
        !withdrawal.txid.startsWith('0x') &&
        withdrawal.txData
    ) {
      withdrawEth(ethAccount, withdrawal, callAsync);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawal.txid, withdrawal.status]);
  return null;
}
