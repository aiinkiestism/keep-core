import React, { useState } from 'react'
import rewardsService from '../services/rewards.service'
import { useFetchData } from '../hooks/useFetchData'
import { WithdrawalHistoryItem } from './WithdrawalHistoryItem'
import { SeeAllButton } from './SeeAllButton'
import { LoadingOverlay } from './Loadable'

const previewDataCount = 3


export const WithdrawalHistory = (props) => {
  const { isFetching, data } = useFetchData(rewardsService.fetchWithdrawalHistory, [])
  const [showAll, setShowAll] = useState(false)

  return (
    <LoadingOverlay isFetching={isFetching} >
      <ul className="withdrawal-history tile">
        <h6>Withdrawal History</h6>
        {showAll ? data.map(renderWithdrawalHistoryItem) : data.slice(0, previewDataCount).map(renderWithdrawalHistoryItem)}
        <SeeAllButton
          dataLength={data.length}
          previewDataCount={previewDataCount}
          onClickCallback={() => setShowAll(!showAll)}
          showAll={showAll}
        />
      </ul>
    </LoadingOverlay>
  )
}

const renderWithdrawalHistoryItem = (history, index) => <WithdrawalHistoryItem key={index} {...history} />
