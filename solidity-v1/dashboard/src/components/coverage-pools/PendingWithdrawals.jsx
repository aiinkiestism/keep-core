import React, { useEffect, useState } from "react"
import { reinitiateWithdraw } from "../../actions/coverage-pool"
import { useDispatch, useSelector } from "react-redux"
import { useModal } from "../../hooks/useModal"
import ProgressBar from "../ProgressBar"
import { colors } from "../../constants/colors"
import moment from "moment"
import * as Icons from "../Icons"
import Tooltip from "../Tooltip"
import BigNumber from "bignumber.js"
import { Column, DataTable } from "../DataTable"
import resourceTooltipProps from "../../constants/tooltips"
import TokenAmount from "../TokenAmount"
import { covKEEP, KEEP } from "../../utils/token.utils"
import Button from "../Button"
import { Keep } from "../../contracts"
import { useWeb3Address } from "../WithWeb3Context"
import { ResourceTooltipContent } from "../ResourceTooltip"
import {
  COVERAGE_POOL_CLAIM_TOKENS_CALENDAR_EVENT,
  MODAL_TYPES,
} from "../../constants/constants"
import AddToCalendar from "../AddToCalendar"

const PendingWithdrawals = ({ covTokensAvailableToWithdraw }) => {
  const dispatch = useDispatch()
  const { openModal } = useModal()
  const yourAddress = useWeb3Address()

  const {
    totalValueLocked,
    covTotalSupply,
    withdrawalDelay,
    withdrawalTimeout,
    pendingWithdrawal,
    withdrawalInitiatedTimestamp,
  } = useSelector((state) => state.coveragePool)
  const [currentDateInUnix, setCurrentDateInUnix] = useState(moment().unix())

  useEffect(() => {
    const myInterval = setInterval(() => {
      setCurrentDateInUnix(moment().unix())
    }, 1000)
    return () => {
      clearInterval(myInterval)
    }
  })

  const onClaimTokensSubmitButtonClick = (covAmount) => {
    openModal(MODAL_TYPES.CovPoolClaimTokens, {
      covAmount,
      address: yourAddress,
      collateralTokenAmount: Keep.coveragePoolV1.estimatedBalanceFor(
        covAmount,
        covTotalSupply,
        totalValueLocked
      ),
    })
  }

  const onReinitiateWithdrawal = () => {
    dispatch(reinitiateWithdraw())
  }

  const formattedDataForDataTable =
    withdrawalInitiatedTimestamp > 0
      ? [
          {
            covAmount: pendingWithdrawal,
            timestamp: withdrawalInitiatedTimestamp,
          },
        ]
      : []

  const renderProgressBar = (
    withdrawalDate,
    endOfWithdrawalDelayDate,
    currentDate
  ) => {
    const progressBarValueInSeconds = currentDate.diff(
      withdrawalDate,
      "seconds"
    )
    const progressBarTotalInSeconds = endOfWithdrawalDelayDate.diff(
      withdrawalDate,
      "seconds"
    )
    return (
      <ProgressBar
        total={progressBarTotalInSeconds}
        bgColor={colors.yellowPrimary}
      >
        <ProgressBar.Inline
          height={20}
          className={"pending-withdrawal__progress-bar"}
        >
          <ProgressBar.InlineItem
            value={progressBarValueInSeconds}
            color={colors.yellowSecondary}
          />
        </ProgressBar.Inline>
      </ProgressBar>
    )
  }

  const renderCooldownStatus = (timestamp) => {
    const withdrawalDate = moment.unix(timestamp)
    const currentDate = moment.unix(currentDateInUnix)
    const endOfWithdrawalDelayDate = moment
      .unix(timestamp)
      .add(withdrawalDelay, "seconds")

    const days = endOfWithdrawalDelayDate.diff(currentDate, "days")
    const hours = moment
      .duration(endOfWithdrawalDelayDate.diff(currentDate))
      .hours()
    const minutes = moment
      .duration(endOfWithdrawalDelayDate.diff(currentDate))
      .minutes()
    const seconds = moment
      .duration(endOfWithdrawalDelayDate.diff(currentDate))
      .seconds()

    const timeUntilAvailable =
      days > 0
        ? `${days}d ${hours}h ${minutes}m`
        : `${hours}h ${minutes}m ${seconds}s`

    let cooldownStatus = <></>
    if (currentDate.isBefore(endOfWithdrawalDelayDate, "seconds")) {
      cooldownStatus = (
        <>
          {renderProgressBar(
            withdrawalDate,
            endOfWithdrawalDelayDate,
            currentDate
          )}
          <div className={"pending-withdrawal__cooldown-time-container"}>
            <span
              className={"text-label text-label--without-hover text-black"}
            >{`Available: ${endOfWithdrawalDelayDate.format(
              "MM/DD/YYYY"
            )}, in ${timeUntilAvailable}`}</span>
          </div>
          <AddToCalendar
            {...COVERAGE_POOL_CLAIM_TOKENS_CALENDAR_EVENT}
            startsAt={endOfWithdrawalDelayDate.unix()}
            endsAt={endOfWithdrawalDelayDate
              .add(withdrawalTimeout, "seconds")
              .unix()}
            className="pending-withdrawal__add-to-calendar-dropdown"
          />
        </>
      )
    } else {
      cooldownStatus = (
        <>
          <div className={"pending-withdrawal__cooldown-completed"}>
            <Icons.Success className={"success-icon"} />{" "}
            <span>Cooldown completed</span>
          </div>
          <div className={"pending-withdrawal__cooldown-end-date text-grey-70"}>
            <span>
              {endOfWithdrawalDelayDate.format("MM/DD/YYYY")} at{" "}
              {endOfWithdrawalDelayDate.format("HH:mm:ss")}{" "}
            </span>
          </div>
        </>
      )
    }

    return (
      <div className={"pending-withdrawal__cooldown-status"}>
        {cooldownStatus}
      </div>
    )
  }

  const isWithdrawalDelayOver = (pendingWithdrawalTimestamp) => {
    const currentDate = moment.unix(currentDateInUnix)
    const endOfWithdrawalDelayDate = moment
      .unix(pendingWithdrawalTimestamp)
      .add(withdrawalDelay, "seconds")

    return currentDate.isAfter(endOfWithdrawalDelayDate)
  }

  const isWithdrawalTimeoutOver = (pendingWithdrawalTimestamp) => {
    const currentDate = moment.unix(currentDateInUnix)
    const endOfWithdrawalTimeoutDate = moment
      .unix(pendingWithdrawalTimestamp)
      .add(withdrawalDelay, "seconds")
      .add(withdrawalTimeout, "seconds")

    return currentDate.isAfter(endOfWithdrawalTimeoutDate, "second")
  }

  const renderTimeLeftToClaimText = (pendingWithdrawalTimestamp) => {
    const currentDate = moment.unix(currentDateInUnix)
    const endOfWithdrawalDelayDate = moment
      .unix(pendingWithdrawalTimestamp)
      .add(withdrawalDelay, "seconds")

    if (currentDate.isBefore(endOfWithdrawalDelayDate, "second")) {
      return <></>
    }

    const endOfWithdrawalTimeoutDate = moment
      .unix(pendingWithdrawalTimestamp)
      .add(withdrawalDelay, "seconds")
      .add(withdrawalTimeout, "seconds")

    const days = endOfWithdrawalTimeoutDate.diff(currentDate, "days")
    const hours = moment
      .duration(endOfWithdrawalTimeoutDate.diff(currentDate))
      .hours()
    const minutes = moment
      .duration(endOfWithdrawalTimeoutDate.diff(currentDate))
      .minutes()
    const seconds = moment
      .duration(endOfWithdrawalTimeoutDate.diff(currentDate))
      .seconds()

    const timeToClaimWithUnits =
      days > 0
        ? `${days}d ${hours}h ${minutes}m`
        : `${hours}h ${minutes}m ${seconds}s`

    let timeToClaim = <></>
    if (!isWithdrawalTimeoutOver(pendingWithdrawalTimestamp)) {
      timeToClaim = (
        <div
          className={"coverage-pool__withdrawal-claim-tokens-info-container"}
        >
          <div className={"coverage-pool__withdrawal-available-for"}>
            <h4>
              Available for:{" "}
              <span className={days > 0 ? "text-black" : "text-error"}>
                {timeToClaimWithUnits}
              </span>
            </h4>
            <Tooltip
              triggerComponent={Icons.MoreInfo}
              className={"withdrawal-available-for__tooltip"}
            >
              <ResourceTooltipContent
                {...resourceTooltipProps.covPoolsAvailableToWithdraw}
              />
            </Tooltip>
          </div>
          <span className={"coverage-pool__withdrawal-expired-at"}>
            Expires:&nbsp;
            {endOfWithdrawalTimeoutDate.format("MM/DD/YYYY")} at{" "}
            {endOfWithdrawalTimeoutDate.format("HH:mm:ss")}{" "}
          </span>
        </div>
      )
    } else {
      timeToClaim = (
        <div className={"coverage-pool__withdrawal-expired-error"}>
          <h4 className={"text-error"}>Claim window expired</h4>
          <Tooltip
            triggerComponent={Icons.MoreInfo}
            className={"withdrawal-expired__tooltip"}
          >
            <ResourceTooltipContent
              {...resourceTooltipProps.covPoolsAvailableToWithdraw}
            />
          </Tooltip>
        </div>
      )
    }

    return timeToClaim
  }

  const renderPendingWithdrawalButtonText = (pendingWithdrawalTimestamp) => {
    let pendingWithdrawalButtonText = <span>claim tokens</span>
    if (isWithdrawalTimeoutOver(pendingWithdrawalTimestamp)) {
      pendingWithdrawalButtonText = (
        <span className={"pending-withdrawal__button-container__button-text"}>
          <Icons.Refresh className={"mr-1"} />
          <span>re-initiate</span>
        </span>
      )
    }
    return pendingWithdrawalButtonText
  }

  return (
    <section
      className={`tile pending-withdrawal 
      ${
        !new BigNumber(withdrawalInitiatedTimestamp).isZero() &&
        isWithdrawalTimeoutOver(withdrawalInitiatedTimestamp)
          ? "pending-withdrawal--withdrawal-expired"
          : ""
      }
      `}
    >
      <DataTable
        data={formattedDataForDataTable}
        itemFieldId="pendingWithdrawalId"
        title="Pending withdrawal"
        withTooltip
        tooltipProps={resourceTooltipProps.pendingWithdrawal}
        noDataMessage="No pending withdrawals."
      >
        <Column
          header="amount"
          field="covAmount"
          renderContent={({ covAmount, timestamp }) => {
            return (
              <div>
                <TokenAmount
                  amount={covAmount}
                  wrapperClassName={"pending-withdrawal__token-amount"}
                  token={covKEEP}
                />
                <TokenAmount
                  amount={Keep.coveragePoolV1.estimatedBalanceFor(
                    covAmount,
                    covTotalSupply,
                    totalValueLocked
                  )}
                  amountClassName={"h3 text-grey-40"}
                  symbolClassName={"h3 text-grey-40"}
                  token={KEEP}
                />
              </div>
            )
          }}
        />
        <Column
          header="cooldown status"
          field="timestamp"
          tdClassName={"cooldown-status-column"}
          renderContent={({ timestamp }) => {
            return renderCooldownStatus(timestamp)
          }}
        />
        <Column
          header=""
          field="timestamp"
          renderContent={({ covAmount, timestamp }) => (
            <div className={"pending-withdrawal__button-container"}>
              <Button
                className="btn btn-lg btn-primary"
                onClick={() => {
                  if (isWithdrawalTimeoutOver(timestamp)) {
                    onReinitiateWithdrawal()
                  } else {
                    onClaimTokensSubmitButtonClick(covAmount)
                  }
                }}
                disabled={!isWithdrawalDelayOver(timestamp)}
              >
                {renderPendingWithdrawalButtonText(timestamp)}
              </Button>
              <span
                className={
                  "pending-withdrawal__button-container__time-left-text"
                }
              >
                {renderTimeLeftToClaimText(timestamp)}
              </span>
            </div>
          )}
        />
      </DataTable>
    </section>
  )
}

export default PendingWithdrawals
