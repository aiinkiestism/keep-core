import React from "react"
import ModalWithTimeline, {
  MODAL_WITH_TIMELINE_STEPS,
} from "./ModalWithTImeline"
import { covKEEP, KEEP } from "../../utils/token.utils"
import { shortenAddress } from "../../utils/general.utils"
import WithdrawalInfo from "./WithdrawalInfo"
import { Keep } from "../../contracts"
import TokenAmount from "../TokenAmount"

const InitiateCovPoolsWithdrawModal = ({
  amount,
  covTokensAvailableToWithdraw,
  totalValueLocked,
  covTotalSupply,
  containerTitle,
  submitBtnText,
  onBtnClick,
  onCancel,
  className = "",
  transactionFinished = false,
}) => {
  return (
    <ModalWithTimeline
      className={`withdraw-modal__main-container ${className}`}
      step={
        transactionFinished
          ? MODAL_WITH_TIMELINE_STEPS.COOLDOWN
          : MODAL_WITH_TIMELINE_STEPS.WITHDRAW_DEPOSIT
      }
      withDescription={true}
    >
      <WithdrawalInfo
        transactionFinished={transactionFinished}
        containerTitle={containerTitle}
        submitBtnText={submitBtnText}
        onBtnClick={onBtnClick}
        onCancel={onCancel}
        amount={amount}
        totalValueLocked={totalValueLocked}
        covTotalSupply={covTotalSupply}
      >
        <div className={"withdraw-modal__data-row"}>
          <h4 className={"text-grey-50"}>Exchange Rate&nbsp;</h4>
          <h4 className={"withdraw-modal__data__value text-grey-70"}>
            1 covKEEP = ~
            {KEEP.displayAmountWithSymbol(
              Keep.coveragePoolV1.estimatedBalanceFor(
                KEEP.fromTokenUnit(1).toString(),
                covTotalSupply,
                totalValueLocked
              )
            )}
          </h4>
        </div>
        <div className={"withdraw-modal__data-row"}>
          <h4 className={"text-grey-50"}>Pool Balance &nbsp;</h4>
          <TokenAmount
            amount={covTokensAvailableToWithdraw}
            wrapperClassName={"withdraw-modal__data__value"}
            amountClassName={"h4 text-grey-70"}
            symbolClassName={"h4 text-grey-70"}
            token={covKEEP}
          />
        </div>
        <div className={"withdraw-modal__data-row"}>
          <h4 className={"text-grey-50"}>Wallet &nbsp;</h4>
          <h4 className={"withdraw-modal__data__value text-grey-70"}>
            {shortenAddress("0x254673e7c7d76e051e80d30FCc3EA6A9C2a22222")}
          </h4>
        </div>
      </WithdrawalInfo>
    </ModalWithTimeline>
  )
}

export default InitiateCovPoolsWithdrawModal