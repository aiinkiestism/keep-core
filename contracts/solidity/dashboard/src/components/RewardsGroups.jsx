import React, { useState } from 'react'
import { RewardsGroupItem } from './RewardsGroupItem'
import { SeeAllButton } from './SeeAllButton'
import NoData from './NoData'
import * as Icons from './Icons'
import { LoadingOverlay } from './Loadable'

const previewDataCount = 3

export const RewardsGroups = ({ groups, isFetching }) => {
  const [showAll, setShowAll] = useState(false)

  return (
    <LoadingOverlay isFetching={isFetching} classNames='group-items self-start tile'>
      <ul className='group-items self-start tile'>
        { groups.length === 0 ?
          <NoData
            title='No rewards yet!'
            iconComponent={<Icons.Badge width={100} height={100} />}
            content='You can withdraw any future earned rewards from your delegated stake on this page.'
          /> :
          <>
            <h6>Withdrawal Overview</h6>
            {showAll ? groups.map(renderGroupItem) : groups.slice(0, previewDataCount).map(renderGroupItem)}
            <SeeAllButton
              dataLength={groups.length}
              previewDataCount={previewDataCount}
              onClickCallback={() => setShowAll(!showAll)}
              showAll={showAll}
            />
          </>
        }
      </ul>

    </LoadingOverlay>
  )
}

const renderGroupItem = (group, index) => <RewardsGroupItem key={group.groupIndex} {...group} />