import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    try {
        const { channelId } = req.params
    
        if (!isValidObjectId(channelId)) {
            throw new ApiError(400, "Invalid channel Id")
        }

        const findSub = await Subscription.findOne(
            { $and: [{ subscriber: req.user?._id }, { channel: channelId }] }
        )

        if (!findSub) {
            const subscribed = await Subscription.create({
                subscriber: req.user?._id,
                channel: channelId
            })

            if (!subscribed) {
                throw new ApiError(
                    400,
                    "Error while Toggle Subscriber"
                )
            }

            return res
                .status(200)
                .json(new ApiResponse(200, subscribed, "Channel subscribed successfully"))
        }

        const unSubscribed = await Subscription.findByIdAndDelete(findSub._id)
        if (!unSubscribed) {
            throw new ApiError(
                400,
                "Error while unsubbing"
            )
        }
        return res
            .status(204)
            .json(
                new ApiResponse(
                    204,
                    unSubscribed,
                    "UnSubed from Channel"
                )
            )

    } catch (error) {
        throw new ApiError(400, error?.message || "Error while toggling the Subscription")
    }

})
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    try {
        const { channelId } = req.params 
        if (!isValidObjectId(channelId)) {
            throw new ApiError(400, "Invalid channelId")
        }
        const channelList = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "subscriber",
                    as: "subscriber"
                }
            },
        ])
        if (!channelList) {
            throw new ApiError(
                400,
                "Error while getting subscribers List"
            )
        }
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    channelList[0],
                    "Fetched Subscriber list"
                )
            )
    } catch (error) {
        throw new ApiError(
            400,
            error.message || "Error in get User Channel Subscribers"
        )
    }

})


const getSubscribedChannels = asyncHandler(async (req, res) => {
  try {
      const { subscriberId } = req.params
  
      if(!isValidObjectId(subscriberId)){
          throw new ApiError(400,"no such channel exits")
      }
  
      const channelList = await Subscription.aggregate([
          {
              $match:{
                  subscriber:new mongoose.Types.ObjectId(subscriberId)
              }
          },
          {
              $lookup:{
                  from:"users",
                  localField:"subscriber",
                  foreignField:"_id",
                  as:"channel"
              }
          }
      ])
      if (!channelList) {
          throw new ApiError(
              400,
              "Error while getting My subscribed List"
          )
      }
      return res
      .status(200)
      .json(
          new ApiResponse(
              200,
              channelList,
              "Fetched  My Subscribed list"
          )
      )
  } catch (error) {

    throw new ApiError(400,error?.message || "Error while fetching channel list")
  }

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}