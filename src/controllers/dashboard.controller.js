import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.models.js"
import { Subscription } from "../models/subscription.models.js"
import { Like } from "../models/like.models.js"
import { User } from "../models/user.models.js"
import { Tweet } from "../models/tweet.models.js"
import { Comment } from "../models/comment.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) =>

{
    let { channel } = req.body
   
    channel = await User.findOne({ username: channel })
    if (!channel) { throw new ApiError(400, "Channel not found!") }

    const channelID = new mongoose.Types.ObjectId(channel?._id)

    if (!isValidObjectId(channelID)) { throw new ApiError(400, "channel not found") }

    const totalViewsAndVideos = await Video.aggregate([
        {
            $match: {
                $and: [
                    { owner: new mongoose.Types.ObjectId(channelID) },
                    { isPublished: true }
                ]
            }
        }, {
            $group: {
                _id: "$owner",
                totalViews: { $sum: "$views" }, 
                totalVideos: { $sum: 1 } 
            }
        },


    ])
    const totalSubs = await Subscription.aggregate([
        { $match: { channel: new mongoose.Types.ObjectId(channelID) } },
        { $count: "totalSubcribers" } 
    ])

    const totalTweets = await Tweet.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelID) } },
        { $count: "totalTweets" }
    ])

    const totalComments = await Comment.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelID) } },
        { $count: "totalComments" }
    ])
    const totalVideoLikes = await Like.aggregate([
        {
            $match: {
                $and: [
                    { likedBy: new mongoose.Types.ObjectId(channelID) },
                    { video: { $exists: true } }  
                ]
            }
        },
        { $count: "totalVideoLikes" }
    ])
    const totalCommentLikes = await Like.aggregate([
        {
            $match: {
                $and: [
                    { likedBy: new mongoose.Types.ObjectId(channelID) },
                    { Comment: { $exists: true } }
                ]
            }
        },
        { $count: "totalCommentLikes" }
    ])

    const totalTweetLikes = await Like.aggregate([
        {
            $match: {
                $and: [
                    { likedBy: new mongoose.Types.ObjectId(channelID) },
                    { tweet: { $exists: true } }
                ]
            }
        },
        { $count: "totalTweetLikes" }
    ])

    return res.status(200)
        .json(new ApiResponse(200, {
            "totalViews": totalViewsAndVideos[0]?.totalViews,
            "totalVideos": totalViewsAndVideos[0]?.totalVideos,
            "totalSubs": totalSubs[0]?.totalSubcribers,
            "totalTweets": totalTweets[0]?.totalTweets,
            "totalComments": totalComments[0]?.totalComments,
            "totalVideoLikes": totalVideoLikes[0]?.totalVideoLikes,
            "totalCommentLikes": totalCommentLikes[0]?.totalCommentLikes,
            "totalTweetLikes": totalTweetLikes[0]?.totalTweetLikes
        }, "Stats of the chanel"))

})


const getChannelVideos = asyncHandler(async (req, res) => 
   
    {
       const videos = await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $project:{
                videoFile:1,
                thumbnail:1,
                title:1,
                duration:1,
                views:1,
                isPublished:1,
                owner:1,
                createdAt:1,
                updatedAt:1
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Fetched videos"
        )
    )
    })


export {
    getChannelStats,
    getChannelVideos
}